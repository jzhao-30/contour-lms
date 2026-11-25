import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { respondWithList } from "@/lib/api/consultations";
import { ROLES } from "@/lib/roles";

/**
 * GET /api/admin/consultations
 * Every consultation, read-only. requireAuth returns 403 for non-admins, and RLS
 * would still limit a non-admin to their own rows.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth([ROLES.admin]);
  if (auth instanceof Response) return auth;

  // no student filter: RLS lets admins see every row
  return respondWithList(request, auth, "all");
}
