import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { AuthContext } from "@/lib/api/auth";
import { parseQuery } from "@/lib/api/request";
import { dbError } from "@/lib/api/response";
import { listQuerySchema, type ListQuery } from "@/lib/validation/consultation";

/** Columns returned to clients. `student` embeds the booker's profile; RLS still limits what a student sees. */
export const CONSULTATION_SELECT =
  "*, student:profiles(email, first_name, last_name)";

/**
 * List query shared by the student and admin endpoints. Pass studentId to scope to one
 * student; RLS decides what is visible either way.
 */
export async function listConsultations(
  supabase: SupabaseClient<Database>,
  { filter, page, page_size }: ListQuery,
  studentId?: string,
) {
  let query = supabase
    .from("consultations")
    // exact count for the pager; switch to keyset pagination at larger scale
    .select(CONSULTATION_SELECT, { count: "exact" });

  if (studentId) query = query.eq("student_id", studentId);

  switch (filter) {
    case "upcoming": // booked and not completed
      query = query.eq("status", "scheduled").eq("is_completed", false);
      break;
    case "completed":
      query = query.eq("is_completed", true);
      break;
    case "cancelled":
      query = query.eq("status", "cancelled");
      break;
  }

  // matches the indexes; id keeps pages stable when timestamps tie; upcoming is soonest first
  const ascending = filter === "upcoming";
  const from = (page - 1) * page_size;

  return query
    .order("scheduled_at", { ascending })
    .order("id", { ascending })
    .range(from, from + page_size - 1);
}

/**
 * The shared GET list handler: validate the query, run it, wrap it in { data, meta }.
 * scope "own" is the caller's rows, "all" is everything RLS allows. Each route's
 * requireAuth decides who may call it.
 */
export async function respondWithList(
  request: Request,
  auth: AuthContext,
  scope: "own" | "all",
) {
  const query = parseQuery(request, listQuerySchema);
  if (query instanceof Response) return query;

  const { data, error, count } = await listConsultations(
    auth.supabase,
    query,
    scope === "own" ? auth.user.id : undefined,
  );
  if (error) return dbError(error);

  return NextResponse.json({
    data,
    meta: { page: query.page, page_size: query.page_size, total: count ?? 0 },
  });
}
