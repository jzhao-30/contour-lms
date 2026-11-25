-- All functions set search_path = '' so another schema can't shadow objects, hence the qualified names.

-- sign-up creates the profile. SECURITY DEFINER because users have no INSERT grant on profiles.
-- the role is never read from metadata, so new accounts are always 'student'
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    left(coalesce(new.raw_user_meta_data ->> 'first_name', ''), 100),
    left(coalesce(new.raw_user_meta_data ->> 'last_name',  ''), 100)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- is_admin() for the RLS policies. SECURITY DEFINER so the lookup skips RLS;
-- otherwise a policy on profiles that calls it would recurse
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- business rules. A trigger rather than CHECK because they depend on the old row and now().
-- the API checks the same rules for friendly errors; this still holds if the API is bypassed
create function public.enforce_consultation_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.scheduled_at <= now() then
      raise exception 'scheduled_at must be in the future' using errcode = 'check_violation';
    end if;
    if new.status <> 'scheduled' or new.is_completed then
      raise exception 'new consultations must be scheduled and not completed' using errcode = 'check_violation';
    end if;
    return new;
  end if;

  -- update
  if new.student_id <> old.student_id or new.created_at <> old.created_at then
    raise exception 'student_id and created_at are immutable' using errcode = 'check_violation';
  end if;

  -- cancelled is final
  if old.status = 'cancelled' then
    raise exception 'a cancelled consultation can no longer be modified' using errcode = 'check_violation';
  end if;

  -- reschedule: must be in the future, and not once completed
  if new.scheduled_at <> old.scheduled_at then
    if new.scheduled_at <= now() then
      raise exception 'scheduled_at must be in the future' using errcode = 'check_violation';
    end if;
    if old.is_completed then
      raise exception 'a completed consultation cannot be rescheduled' using errcode = 'check_violation';
    end if;
  end if;

  -- cancel: un-tick completed first
  if new.status = 'cancelled' and old.is_completed then
    raise exception 'a completed consultation cannot be cancelled' using errcode = 'check_violation';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger consultations_enforce_rules
  before insert or update on public.consultations
  for each row execute function public.enforce_consultation_rules();
