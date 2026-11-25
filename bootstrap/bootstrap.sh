#!/usr/bin/env bash
# One command to run the app locally: checks the prerequisites, starts local Supabase in Docker
# (migrations and seed data are applied on first start), then starts Next.js. Next serves the
# pages and the /api routes, so this is the whole frontend and backend.
# This folder sits next to the project (lms/bootstrap and lms/contour-lms) and works on it from
# here. macOS and Linux; on Windows use WSL or Git Bash.
#
#   ./bootstrap/bootstrap.sh            start everything
#   ./bootstrap/bootstrap.sh --reset    rebuild the database from the migrations and seed first
#   ./bootstrap/bootstrap.sh --full     also start Supabase Studio and the other optional services
#
# PROJECT_DIR=/path/to/contour-lms ./bootstrap/bootstrap.sh   if the project is somewhere else
set -euo pipefail

# run from the project root, wherever this script is called from
PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")" && pwd)/../contour-lms}"
if [ ! -f "$PROJECT_DIR/package.json" ]; then
  echo "ERROR: can't find the project at $PROJECT_DIR. Set PROJECT_DIR to its path." >&2
  exit 1
fi
cd "$PROJECT_DIR"

RESET=0
FULL=0
for arg in "$@"; do
  case "$arg" in
    --reset) RESET=1 ;;
    --full) FULL=1 ;;
    *) echo "Unknown option: $arg (use --reset or --full)" >&2; exit 1 ;;
  esac
done

SUPABASE_URL="http://127.0.0.1:54321"
APP_PORT=3000

step() { printf '\n==> %s\n' "$1"; }
fail() { printf '\nERROR: %s\n' "$1" >&2; exit 1; }

# ---- prerequisites
command -v node >/dev/null 2>&1 || fail "Node 20 or newer is required, but node wasn't found."
[ "$(node -p 'Number(process.versions.node.split(".")[0])')" -ge 20 ] \
  || fail "Node 20 or newer is required (found $(node -v))."
command -v curl >/dev/null 2>&1 || fail "curl is required."
docker info >/dev/null 2>&1 || fail "Docker isn't running. Start Docker Desktop and run this again."

# something already listening means the port is taken
if (exec 3<>"/dev/tcp/127.0.0.1/$APP_PORT") 2>/dev/null; then
  fail "Port $APP_PORT is already in use. Stop whatever is using it and try again."
fi

# ---- project setup
step "Checking project files"
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "created .env.local from .env.example"
fi
if [ ! -d node_modules ]; then
  step "Installing dependencies (npm install)"
  npm install || fail "npm install failed."
fi

API_KEY="$(grep '^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=' .env.local | head -n1 | cut -d= -f2-)"

# ---- local Supabase
# Studio and the log/edge services aren't needed by the app and add several GB of images,
# so they are skipped unless --full is passed.
START=(npx supabase start)
[ "$FULL" -eq 1 ] || START+=(-x studio,edge-runtime,postgres-meta,logflare,vector,imgproxy)

if ! npx supabase status >/dev/null 2>&1; then
  step "Starting local Supabase (the first run pulls Docker images, which can take a few minutes)"
  "${START[@]}" || fail "Supabase didn't start. If Docker is out of disk space, free some and retry."
elif [ "$RESET" -eq 1 ]; then
  step "Rebuilding the database from the migrations and seed data"
  npx supabase db reset || fail "db reset failed."
else
  step "Local Supabase is already running"
fi

step "Waiting for the API"
ready=0
for _ in $(seq 1 60); do
  if curl -sf -o /dev/null -H "apikey: $API_KEY" "$SUPABASE_URL/auth/v1/settings"; then ready=1; break; fi
  sleep 2
done
[ "$ready" -eq 1 ] || fail "Supabase didn't answer at $SUPABASE_URL. Check .env.local against \`npx supabase status\`."

# A running stack with no tables means the migrations never ran (PGRST205), so rebuild it.
if curl -s -H "apikey: $API_KEY" "$SUPABASE_URL/rest/v1/consultations?select=id" | grep -q PGRST205; then
  step "The database has no tables yet, applying migrations and seed data"
  npx supabase db reset || fail "db reset failed."
fi

# ---- app
cat <<EOF

Ready. The app starts at http://localhost:$APP_PORT

The demo accounts and their passwords are in credentials.md, which was sent separately.

Ctrl+C stops the app. The database keeps running; \`npm run db:stop\` (in $PROJECT_DIR) stops it.
EOF

step "Starting the app (npm run dev)"
exec npm run dev
