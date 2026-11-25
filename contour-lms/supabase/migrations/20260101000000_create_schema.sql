-- Enums, tables and indexes. Functions and triggers are in migration 2, access control in 3.

-- enums: the database rejects unknown values
create type public.user_role           as enum ('student', 'admin');
create type public.consultation_status as enum ('scheduled', 'cancelled');

-- one row per auth user. The role is stored here, not in user_metadata, which users can edit.
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,                       -- copied so admins can see who booked
  first_name  text not null default '' check (char_length(first_name) <= 100),
  last_name   text not null default '' check (char_length(last_name)  <= 100),
  role        public.user_role not null default 'student',
  created_at  timestamptz not null default now()
);

-- status is the booking lifecycle, is_completed is the student's own tick.
-- kept separate so cancelling doesn't lose the flag
create table public.consultations (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles (id) on delete cascade,
  first_name    text not null check (char_length(btrim(first_name)) between 1 and 100),
  last_name     text not null check (char_length(btrim(last_name))  between 1 and 100),
  reason        text not null check (char_length(btrim(reason))     between 1 and 1000),
  scheduled_at  timestamptz not null,              -- stored in UTC, UI converts
  status        public.consultation_status not null default 'scheduled',
  is_completed  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint consultations_cancelled_not_completed
    check (not (status = 'cancelled' and is_completed))
);

-- student dashboard (also used by RLS and the FK)
create index consultations_student_scheduled_idx
  on public.consultations (student_id, scheduled_at desc, id);

-- admin list; id keeps pagination stable
create index consultations_scheduled_idx
  on public.consultations (scheduled_at desc, id);
