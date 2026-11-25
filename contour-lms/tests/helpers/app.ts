import { spawn, type ChildProcess } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

/**
 * Helpers for tests that hit the running app over HTTP. startApp() reuses a running server
 * or starts `next dev` and stops it afterwards. signInCookie() builds the session cookie the
 * browser would send.
 */

export const APP_URL = process.env.TEST_APP_URL ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

async function isUp(): Promise<boolean> {
  try {
    return (await fetch(`${APP_URL}/auth/login`)).ok;
  } catch {
    return false;
  }
}

/** Makes sure the app is reachable; returns a function that stops it if we started it. */
export async function startApp(): Promise<() => void> {
  if (await isUp()) return () => {}; // already running, e.g. npm run dev

  const child: ChildProcess = spawn(
    "npx",
    ["next", "dev", "-p", new URL(APP_URL).port || "3000"],
    {
      cwd: process.cwd(),
      stdio: "ignore",
      detached: true, // own process group so the whole tree can be stopped
    },
  );

  const deadline = Date.now() + 80_000;
  while (Date.now() < deadline) {
    if (await isUp()) {
      return () => {
        if (child.pid) process.kill(-child.pid); // negative pid kills the group
      };
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (child.pid) process.kill(-child.pid);
  throw new Error(`Next.js did not start at ${APP_URL} within 80s`);
}

/**
 * The cookie @supabase/ssr sets after login: "base64-" + base64url(session), named
 * sb-<host label>-auth-token, split into 3180-character chunks when too long.
 */
export async function signInCookie(email: string): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: "Password123!",
  });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);

  const name = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
  const value =
    "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url");
  if (value.length <= 3180) return `${name}=${value}`;
  return (value.match(/.{1,3180}/g) as string[])
    .map((chunk, i) => `${name}.${i}=${chunk}`)
    .join("; ");
}

/** fetch with an optional session cookie; redirects are not followed. */
export function call(path: string, cookie?: string, init: RequestInit = {}) {
  return fetch(APP_URL + path, {
    redirect: "manual",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });
}

/** JSON request with a body. */
export const send = (
  method: "POST" | "PATCH",
  path: string,
  cookie: string,
  body: unknown,
) => call(path, cookie, { method, body: JSON.stringify(body) });

export const inDays = (n: number) =>
  new Date(Date.now() + n * 86_400_000).toISOString();
