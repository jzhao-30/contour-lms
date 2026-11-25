-- Access control in two layers, both enforced by Postgres: GRANTs (which columns) and RLS (which rows).
-- Students manage their own consultations (cancel, never delete). Admins read everything and write nothing.

alter table public.profiles      enable row level security;
alter table public.consultations enable row level security;
-- no FORCE: it would also apply to the table owner and break the SECURITY DEFINER functions

-- privileges: start from nothing and grant the minimum. anon gets nothing.
revoke all on public.profiles, public.consultations from anon, authenticated;

-- profiles: users can edit only their name, so `role` can't be changed. The signup trigger inserts rows.
grant select on public.profiles to authenticated;
grant update (first_name, last_name) on public.profiles to authenticated;

-- consultations: insert only the form columns, update only the editable ones, no DELETE
grant select on public.consultations to authenticated;
grant insert (student_id, first_name, last_name, reason, scheduled_at)
  on public.consultations to authenticated;
grant update (scheduled_at, status, is_completed)
  on public.consultations to authenticated;

-- row policies. (select auth.uid()) is evaluated once per query instead of per row.
create policy "profiles: read own, admin reads all"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "consultations: read own, admin reads all"
  on public.consultations for select to authenticated
  using (student_id = (select auth.uid()) or public.is_admin());

-- writes: own rows only, and not for admins. Read-only admin is enforced here, not just in the API.
create policy "consultations: students insert own"
  on public.consultations for insert to authenticated
  with check (student_id = (select auth.uid()) and not public.is_admin());

create policy "consultations: students update own"
  on public.consultations for update to authenticated
  using (student_id = (select auth.uid()) and not public.is_admin())
  with check (student_id = (select auth.uid()) and not public.is_admin());

-- no DELETE policy, so deletes are denied
