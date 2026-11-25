import "server-only"; // build error if a client component ever imports this
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import type { UserRole } from "@/lib/roles";
import { dbError, forbidden, unauthorized } from "@/lib/api/response";

export type AuthContext = {
  /** Client acting as the caller, so RLS still applies. */
  supabase: SupabaseClient<Database>;
  user: User;
  role: UserRole;
};

/**
 * Authenticates the request and resolves the caller's role. Returns the context, or an
 * error response to return as is:
 *   const auth = await requireAuth();
 *   if (auth instanceof Response) return auth;
 * allowedRoles gives the 403 check. RLS is the second layer.
 */
export async function requireAuth(
  allowedRoles?: UserRole[],
): Promise<AuthContext | NextResponse> {
  const supabase = await createClient();

  // getUser() has the Auth server validate the token. getSession() only reads the
  // cookie, which can be forged.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return unauthorized();

  // the role comes from profiles, not user_metadata, which users can edit
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (error) return dbError(error);

  if (allowedRoles && !allowedRoles.includes(profile.role)) return forbidden();

  return { supabase, user, role: profile.role };
}
