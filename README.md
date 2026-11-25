# Running the project, from zero to a working app

This is a small consultation-booking app. Students book and manage their own consultations, and admins get a read-only list of all of them. These steps take you from an empty machine to the app running at http://localhost:3000.

## 0. What to install first

- Docker Desktop, and make sure it is running. Check with `docker info`.
- Node 20 or newer. Check with `node -v`.
- Git, only if you want to clone the repository. You can use the zip instead.
- curl (macOS and Linux already have it).

The start script runs on macOS and Linux. On Windows, use WSL or Git Bash, or follow the manual steps in section 4.

Everything runs on your machine. You don't need AWS or a Supabase account.

## 1. Get the code

Clone it:

```bash
git clone https://github.com/jzhao-30/contour-lms.git
cd contour-lms
```

Or unzip the package and open a terminal in the folder it creates. Either way you should see three folders:

```
bootstrap/     the start script
contour-lms/   the app
document/      the API spec and the diagrams
```

All the commands below are run from this top folder, the one that contains `bootstrap/`.

## 2. Start it

```bash
./bootstrap/bootstrap.sh
```

If it says permission denied, run `bash bootstrap/bootstrap.sh` instead.

The script checks Docker, creates `.env.local`, installs the npm packages, starts Supabase in Docker with the migrations and demo data, and then starts the app. The first run downloads a few GB of Docker images and the npm packages, so it can take a few minutes up to ten depending on your connection. Later runs take a few seconds.

When Next.js prints `Ready`, open http://localhost:3000.

Options:

```bash
./bootstrap/bootstrap.sh --reset    # rebuild the database from the migrations and demo data first
./bootstrap/bootstrap.sh --full     # also start Supabase Studio and the other optional services
```

## 3. Sign in

Local accounts (the demo data creates them, password `Password123!` for all):

- `admin@example.com` (admin), opens `/admin`
- `student1@example.com` (student), opens `/dashboard`
- `student2@example.com` (student)

Anyone can also sign up, and new accounts are always students. No confirmation email is sent.

## 4. Start it by hand

Use this on Windows, or if you'd rather not run the script. From the `contour-lms/` folder inside the top folder:

```bash
cd contour-lms
npm install
cp .env.example .env.local   # it already holds the local Supabase defaults
npm run db:start             # starts Supabase in Docker, creates the tables and the demo data
npm run dev                  # http://localhost:3000
```

## 5. What to try

- As a student: book a consultation, reschedule it, tick it as complete, and cancel another one. The list can be filtered and paged.
- As the admin: you see every student's consultations and who booked them. It is read-only.
- A student can't open `/admin`, and the admin can't book or change anything.

## 6. Run the tests

With the database running (the script leaves it running), from `contour-lms/`:

```bash
npm test
```

That runs 53 tests: the validation rules, the database permissions and rules, and the API over real HTTP. The API tests start the app themselves if it isn't already running.

## 7. Stop, restart, reset

- Ctrl+C stops the app. The database keeps running, so the next start is quick.
- To stop the database, run `npm run db:stop` in `contour-lms/`.
- To start again with a clean database, run `./bootstrap/bootstrap.sh --reset`.

## 8. If something goes wrong

- `Docker isn't running`: start Docker Desktop and run the script again.
- `Port 3000 is already in use`: stop whatever is using it. It is often an old `npm run dev`.
- Nothing seems to happen at first: Docker is pulling the Supabase images. Give it a few minutes.
- `Supabase didn't start`: this is usually Docker running out of disk space. Free some space and retry.
- `Supabase didn't answer`: compare `.env.local` with the output of `npx supabase status`. The URL and the publishable key must match.
- `can't find the project`: the script expects `contour-lms/` next to `bootstrap/`. Run it from the top folder, or set `PROJECT_DIR=/path/to/contour-lms`.

## 9. Where to read more

- `contour-lms/README.md`: how it is built, the API, how roles and security work, and the assumptions I made.
- `document/api/openapi.yaml`: the API spec. Run `npx serve document/api` to see it in Swagger UI (it needs internet for the Swagger assets).
- `document/architecture/architecture.drawio`, `document/db/er-diagram.drawio` and `document/devOps/aws-architecture.drawio`: the diagrams. Open them at https://app.diagrams.net.

## 10. Live deployment

There is also a running copy on AWS: https://d1ouqzgn5k3qgz.cloudfront.net (it opens on the login page). I'll take it down after the review.

- Admin: `demo.admin@example.com` / `*5d#DCm+ixHGXsGg`
- Student: `demo.student@example.com` / `!3P!E5EcQWu7i+me`

Sign-ups there are students too. Forgot password only works for the Supabase project's own team members, because it uses Supabase's built-in mailer. The database is on Supabase's free tier, which pauses when it's idle, so if the site stops loading data, let me know.
