import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { CONSULTATION_SELECT, respondWithList } from "@/lib/api/consultations";
import { parseBody } from "@/lib/api/request";
import { dbError } from "@/lib/api/response";
import { ROLES } from "@/lib/roles";
import { createConsultationSchema } from "@/lib/validation/consultation";

/**
 * GET /api/consultations?filter=&page=&page_size=
 * The caller's own consultations. Admins use /api/admin/consultations for the full list.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  return respondWithList(request, auth, "own");
}

/** POST /api/consultations: book a consultation (students only). */
export async function POST(request: NextRequest) {
  const auth = await requireAuth([ROLES.student]);
  if (auth instanceof Response) return auth;

  const body = await parseBody(request, createConsultationSchema);
  if (body instanceof Response) return body;

  const { data, error } = await auth.supabase
    .from("consultations")
    // student_id comes from the session, never the body (RLS checks it too)
    .insert({ ...body, student_id: auth.user.id })
    .select(CONSULTATION_SELECT)
    .single();
  if (error) return dbError(error);

  return NextResponse.json({ data }, { status: 201 });
}
