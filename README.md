# Mini LMS

A consultation-booking app. Students book and manage their own consultations, and admins get a read-only view of all of them.

**Stack:** Next.js 16 (App Router, TypeScript), Supabase (PostgreSQL, Auth, `supabase-js`, `@supabase/ssr`), shadcn/ui + Tailwind, Zod, TanStack Query, Vitest

1. [Special setup instructions](#1-special-setup-instructions)
2. [Justifications and assumptions](#2-justifications-and-assumptions)
3. [Implementation summary](#3-implementation-summary)
4. [Database migrations and schema](#4-database-migrations-and-schema)

## 1. Special setup instructions

The database is a local Supabase stack that runs in Docker, so there is nothing to sign up for and nothing to configure in the cloud. You need Node 20+, npm and Docker running (plus curl if you use the start script).

### Quick start

From the top folder, the one that contains `bootstrap/` and `contour-lms/`:

```bash
./bootstrap/bootstrap.sh
```

The script creates `.env.local`, installs the dependencies, starts local Supabase with the migrations and seed data, and then starts the app at http://localhost:3000. The first run downloads a few GB of Docker images, so it can take several minutes. Add `--reset` to rebuild the database first. It runs on macOS and Linux; on Windows use WSL or the manual steps below.

### Manual start

From this folder:

```bash
npm install
cp .env.example .env.local   # already holds the local Supabase defaults
npm run db:start             # starts Supabase in Docker, creates the tables and the seed data
npm run dev                  # http://localhost:3000
```

### Configuration worth knowing

- `.env.local` needs two values: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. `.env.example` already has the defaults for the local stack. If the app can't reach the database, compare them with the output of `npx supabase status`. `SUPABASE_SERVICE_ROLE_KEY` is optional and only lets the tests clean up the rows they create.
- Local Supabase uses ports 54321 (API) and 54322 (Postgres), and the app uses 3000.
- Email confirmation is off locally (`supabase/config.jsonc`), so sign-up works without sending an email.
- Anyone can sign up, and new accounts are always students. The seed accounts are listed under Demo accounts below.
- The only way to make an admin is SQL: `update public.profiles set role = 'admin' where email = '...';`

### Demo accounts

These are test accounts with throwaway passwords.

Local, created by the seed data (the password is `Password123!` for all of them):

- `admin@example.com` (admin), opens `/admin`
- `student1@example.com` (student), opens `/dashboard`
- `student2@example.com` (student)

There is also a live deployment at https://d1ouqzgn5k3qgz.cloudfront.net, which opens on the login page. I'll take it down after the review. It has two sample accounts:

- `demo.admin@example.com` / `*5d#DCm+ixHGXsGg` (admin)
- `demo.student@example.com` / `!3P!E5EcQWu7i+me` (student)

Sign-ups there are students too. Forgot password only works for the Supabase project's own team members, because it uses Supabase's built-in mailer. The database is on Supabase's free tier, which pauses when it's idle, so if the site stops loading data, let me know.

### Commands

| Command                           | What it does                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| `npm run dev` / `build` / `start` | Run, build and serve the app                                                         |
| `npm run db:start` / `db:stop`    | Start and stop local Supabase (the first start applies the migrations and seed data) |
| `npm run db:reset`                | Rebuild the local database from the migrations and seed data                         |
| `npm run db:types`                | Regenerate `lib/database.types.ts` from the schema                                   |
| `npm test`                        | Run the 53 tests (needs the database running)                                        |
| `npm run lint` / `typecheck`      | Static checks                                                                        |

### Docker image

The repo has a multi-stage `Dockerfile` that runs as a non-root user. The Supabase URL and key are build arguments, because Next.js compiles `NEXT_PUBLIC_*` values into the JavaScript at build time. `GET /api/health` is the health check.

## 2. Justifications and assumptions

### Justifications

- **API routes, not Server Actions.** The brief asked for APIs. Every data change goes through `/api`, which also makes the behaviour testable over real HTTP. The only calls the browser makes straight to Supabase are the template's login, sign-up and logout.
- **RLS for access control, and the role in `profiles`.** The role is a column in `profiles`, not in `user_metadata`, which users can edit themselves. Putting the rules in the database protects the data whichever code path touches it, so a mistake in a route handler doesn't expose anything. New accounts are always students, and an admin can only be made with SQL.
- **Three layers of checks.** Pages redirect by role (UX only). API routes call `auth.getUser()`, which makes the Auth server validate the token instead of trusting the cookie, and then check the role. The database enforces the rest with RLS, column-level grants and a trigger.
- **Column-level grants and a trigger, not only policies.** Policies decide which rows, the grants decide which columns (so `role` and `student_id` can never be changed), and the trigger keeps the business rules true even if the API is bypassed.
- **SQL migrations and generated types, no ORM.** An ORM connecting straight to Postgres would skip Supabase Auth and RLS, and it can't express triggers, grants or policies. `supabase gen types` gives the same compile-time checking through `supabase-js`.
- **One set of Zod schemas** validates the forms and the API, so the two can't drift apart. Unknown fields are dropped.
- **404 for other people's rows, not 403,** so ids can't be probed. Error responses never include SQL or internal details.
- **Cancelling is a soft delete,** so history is kept and admins still see it. Nobody can delete rows.
- **Times are stored in UTC** and shown in the viewer's timezone. The API requires an ISO timestamp with an offset, so there is no guessing.
- **Offset pagination with a page-size cap of 50.** It is simple and fine at this size. The indexes match the sort order used.
- **shadcn/ui with Tailwind** to spend the time on the wiring, as the brief suggests, and **TanStack Query** for caching and refetching after changes.
- **`server-only` and central constants.** Server code can't be imported into the browser by accident, and routes, roles and pagination limits are each defined once.

### Assumptions

- The name on a booking is who the consultation is for, so it is independent of the account name. I only pre-fill it from the profile.
- Completed and cancelled are separate. Completion is the student's own tick, and cancelling is the lifecycle of the booking.
- The rules are: the time must be in the future, a cancelled consultation can't change, and a completed one has to be un-ticked before it can be rescheduled or cancelled.
- Rescheduling only changes the time.
- A user has one role. Admins are read-only, which the brief allows, and this is enforced in RLS as well as in the API.
- Email confirmation is off so a reviewer can sign up straight away. For production I'd turn it on with a real mail provider.
- The seed data and its passwords are for local development only.

### Known limits

- Offset pagination with an exact count would be replaced by cursor pagination on a large table.
- Each API request makes two calls to Supabase: one to validate the token and one to look up the role. I chose that for safety and so that role changes apply immediately. Putting the role in the token would remove one.
- No rate limiting or CAPTCHA, the password minimum in the local config is 6 characters, and the session cookie is not HttpOnly (the default for `@supabase/ssr`).
- No browser tests, so the dialogs and forms are only checked by hand.

## 3. Implementation summary

It's a single Next.js project with no separate backend. The browser calls the `/api` route handlers, and the handlers talk to Supabase as the signed-in user, so Postgres row level security applies to every query.

```
Browser  ->  /api route handlers  ->  Supabase (as the user)  ->  Postgres
(React)      auth guard + Zod         PostgREST + Auth           RLS, grants, triggers
```

### What it does

- Sign up, log in and log out, with Supabase Auth and cookie sessions.
- **Students, `/dashboard`:** their own consultations, filtered by all, upcoming, completed or cancelled and paged. They can book (first name, last name, reason, date and time, with the names pre-filled and editable), reschedule, cancel (with a confirmation) and tick a consultation as complete or incomplete.
- **Admins, `/admin`:** every consultation and who booked it, with the same filters and paging. Read-only.

### API

| Endpoint                       | Purpose                                                                    |
| ------------------------------ | -------------------------------------------------------------------------- |
| `GET /api/consultations`       | The caller's own consultations (`filter`, `page`, `page_size`)             |
| `POST /api/consultations`      | Book one (students only; the owner comes from the session, never the body) |
| `PATCH /api/consultations/:id` | `action`: `reschedule`, `set_completed` or `cancel` (students, own rows)   |
| `GET /api/admin/consultations` | Every consultation, with the booker's email (admins only)                  |
| `GET /api/health`              | Liveness check, public and doesn't touch the database                      |

Errors share one shape, `{ "error": { "code", "message", "details?" } }`: 401 not signed in, 403 wrong role, 404 not found or not your row, 409 business rule broken, 422 validation failed, 400 bad JSON. The full spec is in `document/api/openapi.yaml`.

### How a request flows

Cancelling a consultation: the dialog calls a TanStack Query mutation, which sends `PATCH /api/consultations/:id` with `{ "action": "cancel" }`. The proxy refreshes the session cookie. The route handler checks the user and role (`requireAuth`), validates the body with Zod, and updates the row filtered by `student_id`. Postgres then applies the grants, the RLS policy and the trigger. The handler returns 200, or 409 if a rule was broken, or 404 if the row isn't the caller's. On success the lists refetch.

### Code layout

```
app/api/                 route handlers: consultations, consultations/[id], admin/consultations, health
app/(app)/               role-guarded pages: dashboard and admin
app/auth/                login, sign-up and password pages (from the template)
components/consultations/  list, dialogs and the query hooks
lib/api/                 auth guard, body and query parsing, error mapping, shared list handler, browser client
lib/validation/          Zod schemas shared by the forms and the API
lib/routes.ts, roles.ts, constants.ts   routes, roles and pagination limits, each defined once
supabase/                migrations, seed.sql, config.jsonc
tests/                   validation, database and API tests
```

### Tests

`npm test` runs 53 tests (start the database first): 11 for the Zod schemas, 20 against the real database as signed-in users (RLS, column grants, the business-rule trigger) and 22 over real HTTP for the API and the redirects by role. The API tests start the app themselves if it isn't running.

## 4. Database migrations and schema

The migrations are plain SQL in `supabase/migrations/`, applied in file order:

| File                                               | Contents                                                    |
| -------------------------------------------------- | ----------------------------------------------------------- |
| `20260101000000_create_schema.sql`                 | Enums, `profiles`, `consultations` and the indexes          |
| `20260101000001_create_functions_and_triggers.sql` | Sign-up trigger, `is_admin()` and the business-rule trigger |
| `20260101000002_rls_and_grants.sql`                | Column-level grants and row level security policies         |

`npm run db:start` applies them on the first start, `npm run db:reset` rebuilds the database from them plus `seed.sql`, and `npx supabase db push --remote` applies them to a hosted project (without the seed). The diagram is in `document/db/er-diagram.drawio`.

```
auth.users  1 --- 1  profiles  1 --- N  consultations
```

### Tables

`profiles`: one row per auth user, created by a trigger on sign-up.

| Column                    | Type          | Notes                                                       |
| ------------------------- | ------------- | ----------------------------------------------------------- |
| `id`                      | `uuid`        | Primary key, references `auth.users(id)` on delete cascade  |
| `email`                   | `text`        | Not null, copied from the user so admins can see who booked |
| `first_name`, `last_name` | `text`        | Not null, default `''`, at most 100 characters              |
| `role`                    | `user_role`   | Not null, default `student`                                 |
| `created_at`              | `timestamptz` | Not null, default `now()`                                   |

`consultations`:

| Column                     | Type                  | Notes                                                 |
| -------------------------- | --------------------- | ----------------------------------------------------- |
| `id`                       | `uuid`                | Primary key, default `gen_random_uuid()`              |
| `student_id`               | `uuid`                | Not null, references `profiles(id)` on delete cascade |
| `first_name`, `last_name`  | `text`                | Not null, 1 to 100 characters after trimming          |
| `reason`                   | `text`                | Not null, 1 to 1000 characters after trimming         |
| `scheduled_at`             | `timestamptz`         | Not null, stored in UTC                               |
| `status`                   | `consultation_status` | Not null, default `scheduled`                         |
| `is_completed`             | `boolean`             | Not null, default `false`                             |
| `created_at`, `updated_at` | `timestamptz`         | Not null, default `now()`                             |

A check constraint stops a consultation from being both cancelled and completed.

Enums: `user_role` is `student` or `admin`, and `consultation_status` is `scheduled` or `cancelled`.

### Indexes

- `consultations (student_id, scheduled_at desc, id)` serves the student dashboard, the RLS filter and the foreign key.
- `consultations (scheduled_at desc, id)` serves the admin list. The `id` keeps pagination stable.

### Functions and triggers

- `on_auth_user_created` runs `handle_new_user()` after a user is inserted into `auth.users`. It creates the profile, copies the names from the sign-up form and never reads the role from metadata, so everyone starts as a student.
- `is_admin()` is `security definer` so the lookup skips RLS. Otherwise a policy on `profiles` that calls it would recurse. It is only executable by signed-in users.
- `consultations_enforce_rules` runs before insert and update. It requires a future time on insert and on reschedule, forces new rows to be scheduled and not completed, makes `student_id` and `created_at` immutable, treats cancelled as final, blocks rescheduling or cancelling a completed consultation, and keeps `updated_at` current. Violations raise a `check_violation` (23514), which the API returns as a 409.

All functions set `search_path = ''`.

### Access control

Both tables have RLS enabled. All privileges are revoked from `anon` and `authenticated`, and then only these are granted back, to `authenticated`:

| Table           | Grants                                                                                                                      | Policies                                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `profiles`      | `select`; `update (first_name, last_name)`                                                                                  | Read your own row, or every row if you are an admin. Update only your own row.                                    |
| `consultations` | `select`; `insert (student_id, first_name, last_name, reason, scheduled_at)`; `update (scheduled_at, status, is_completed)` | Read your own rows, or all rows if you are an admin. Insert and update only your own rows, and never as an admin. |

There is no `delete` grant or policy, so deletes are denied for everyone. `anon` has no access at all.

### Seed data

`supabase/seed.sql` runs on `db:start` and `db:reset`. It creates an admin, two students and a few sample consultations. It is for local development only.
