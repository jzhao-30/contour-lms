import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/roles";
import { homePathFor, ROUTES } from "@/lib/routes";

export type CurrentUser = {
  id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
};

/**
 * Current user for server-rendered pages (API routes use requireAuth). Wrapped in cache()
 * so the layout and the page share one lookup per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, first_name, last_name")
    .eq("id", user.id)
    .single();
  // shouldn't happen, the signup trigger creates the profile
  if (!profile) return null;

  return { id: user.id, email: user.email ?? "", ...profile };
});

/** Page guard: redirects when signed out or in the wrong role. UX only; the API and RLS protect the data. */
export async function requirePageRole(role: UserRole): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(ROUTES.login);
  if (user.role !== role) redirect(homePathFor(user.role));
  return user;
}
