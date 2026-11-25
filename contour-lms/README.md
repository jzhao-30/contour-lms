# Mini LMS

A consultation-booking app. Students book and manage their own consultations, and admins get a read-only view of all of them.

**Stack:** Next.js 16 (App Router, TypeScript), Supabase, shadcn/ui + Tailwind, Zod, TanStack Query, Vitest

## Running locally

You need Node 20+, npm and Docker.

```bash
npm install
cp .env.example .env.local   # already holds the local Supabase defaults
npm run db:start             # starts local Supabase and applies the migrations and seed data
npm run dev                  # http://localhost:3000
```

If the app can't reach the database, compare `.env.local` with the output of `npx supabase status`. `npm run db:stop` stops the database when you're done.

The demo accounts, their passwords and the URL of the live deployment are in a separate file, `credentials.md`, which I sent along with this project. New sign-ups are always students, and email confirmation is off.

Useful commands: `db:reset` rebuilds the database, `db:types` regenerates the types and `npm test` runs the tests.

## Documentation

In `document/`: the OpenAPI spec (`api/openapi.yaml`), the architecture diagrams (`architecture/`) and the ER diagram (`db/`).

## Features

- **Students, `/dashboard`**: view their own consultations (with filters and pagination), and book, reschedule, cancel or mark them complete.
- **Admins, `/admin`**: view every consultation and who booked it. Read-only.

## Architecture

It's a single Next.js project with no separate backend. The browser calls the `/api` routes, and the routes talk to Supabase as the signed-in user, so row level security (RLS) applies to every query. All data changes go through the API, not Server Actions.

| Endpoint                       | Purpose                                                    |
| ------------------------------ | ---------------------------------------------------------- |
| `GET /api/consultations`       | The caller's own consultations                             |
| `POST /api/consultations`      | Book one (students only; the owner comes from the session) |
| `PATCH /api/consultations/:id` | `action`: `reschedule` / `set_completed` / `cancel`        |
| `GET /api/admin/consultations` | Every consultation (admins only)                           |

Error codes: 401 not signed in, 403 wrong role, 404 not found or not your row, 409 business rule broken, 422 validation failed.

The database has two tables, `profiles` and `consultations`. Migrations are plain SQL and types are generated with `supabase gen types`. There's no ORM, because an ORM would bypass RLS.

## Security

- **The role** is stored in `profiles.role`, not in `user_metadata`, which users can edit themselves. New accounts are always students, and the only way to make an admin is with SQL.
- **Three layers of checks:**
  1. Pages redirect by role.
  2. The API validates the token with `auth.getUser()` and checks the role.
  3. The database enforces the rest:
     - RLS: students can only access their own rows, and admins are read-only.
     - Column-level grants: only the intended columns can be changed, and nobody can delete.
     - A trigger enforces the business rules.
- All input goes through Zod, the service-role key is never used, and error responses don't expose internal details.

## Business rules

- Completed and cancelled are separate states. Cancelling is a soft delete, so the row is kept.
- The booking time must be in the future. A cancelled consultation can't be changed. A completed one has to be un-ticked before it can be rescheduled or cancelled.
- Times are stored in UTC and shown in the viewer's timezone.

## Tests

`npm test` runs 53 tests (start `db:start` first): 11 for Zod validation, 20 for RLS and 22 for the API. There are no browser tests yet.

## Docker

Multi-stage build that runs as a non-root user. The Supabase URL and key are passed as build arguments, because `NEXT_PUBLIC_*` values are compiled into the code at build time. The health check endpoint is `/api/health`.
