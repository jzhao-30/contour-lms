import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { CONSULTATION_SELECT } from "@/lib/api/consultations";
import { parseBody } from "@/lib/api/request";
import { dbError, notFound } from "@/lib/api/response";
import { ROLES } from "@/lib/roles";
import {
  idSchema,
  updateConsultationSchema,
  type UpdateConsultationInput,
} from "@/lib/validation/consultation";

/** The columns each action may change. */
function toUpdate(input: UpdateConsultationInput) {
  switch (input.action) {
    case "reschedule":
      return { scheduled_at: input.scheduled_at };
    case "set_completed":
      return { is_completed: input.is_completed };
    case "cancel":
      // soft delete, the row stays
      return { status: "cancelled" as const };
  }
}

/**
 * PATCH /api/consultations/:id
 * Body: { action: "reschedule" | "set_completed" | "cancel", ... }. Students, own rows only.
 */
export async function PATCH(
  request: NextRequest,
  // params is a Promise in Next 15+
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth([ROLES.student]);
  if (auth instanceof Response) return auth;

  const id = idSchema.safeParse((await params).id);
  if (!id.success) return notFound();

  const body = await parseBody(request, updateConsultationSchema);
  if (body instanceof Response) return body;

  const { data, error } = await auth.supabase
    .from("consultations")
    .update(toUpdate(body))
    .eq("id", id.data)
    // ownership filter on top of RLS
    .eq("student_id", auth.user.id)
    .select(CONSULTATION_SELECT)
    .maybeSingle();
  if (error) return dbError(error);

  // no row: missing or not theirs. Same 404 either way, so ids can't be probed.
  if (!data) return notFound();

  // rule violations (cancelled is final etc.) come from the DB trigger and surface as 409
  return NextResponse.json({ data });
}
