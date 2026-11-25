import { Badge } from "@/components/ui/badge";
import type { Consultation } from "@/lib/types";

/** One label from (status, is_completed). Cancelled wins; the DB never allows both. */
export function StatusBadge({
  consultation,
}: {
  consultation: Pick<Consultation, "status" | "is_completed">;
}) {
  if (consultation.status === "cancelled")
    return <Badge variant="destructive">Cancelled</Badge>;
  if (consultation.is_completed) return <Badge variant="secondary">Completed</Badge>;
  return <Badge variant="outline">Scheduled</Badge>;
}
