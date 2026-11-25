-- Local development seed (runs on `supabase start` and `db reset`). Never run it against
-- production: the passwords are public. All three use Password123!
--   admin@example.com (admin), student1@example.com and student2@example.com (students)

-- inserting into auth.users skips the Auth API, so fill in what GoTrue expects: a bcrypt hash,
-- a confirmed email and empty token columns. The signup trigger then creates the profiles.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated',
  u.email, crypt('Password123!', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('first_name', u.first_name, 'last_name', u.last_name),
  now(), now(), '', '', '', ''
from (values
  ('11111111-1111-1111-1111-111111111111'::uuid, 'admin@example.com',    'Ada',   'Admin'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'student1@example.com', 'Sam',   'Student'),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'student2@example.com', 'Taylor','Learner')
) as u(id, email, first_name, last_name);

-- password logins also need a row in auth.identities
insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), id, id::text, 'email',
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  now(), now(), now()
from auth.users
where email in ('admin@example.com', 'student1@example.com', 'student2@example.com');

-- the only way to get an admin: a SQL statement like this (users can't update profiles.role)
update public.profiles set role = 'admin' where email = 'admin@example.com';

-- a few sample consultations
insert into public.consultations (student_id, first_name, last_name, reason, scheduled_at)
values
  ('22222222-2222-2222-2222-222222222222', 'Sam', 'Student', 'Course selection advice', now() + interval '2 days'),
  ('22222222-2222-2222-2222-222222222222', 'Sam', 'Student', 'Exam preparation strategy', now() + interval '5 days'),
  ('33333333-3333-3333-3333-333333333333', 'Taylor', 'Learner', 'Career pathway discussion', now() + interval '3 days');
