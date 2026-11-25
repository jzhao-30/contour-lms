"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/datetime";
import type { Consultation } from "@/lib/types";
import { updateConsultationSchema } from "@/lib/validation/consultation";
import { useUpdateConsultation } from "./use-consultations";

/** New date/time picker for one consultation. */
export function RescheduleDialog({
  consultation,
  open,
  onOpenChange,
}: {
  consultation: Consultation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // start from the current slot
  const [when, setWhen] = useState(toLocalInputValue(consultation.scheduled_at));
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateConsultation();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = updateConsultationSchema.safeParse({
      action: "reschedule",
      scheduled_at: fromLocalInputValue(when),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    update.mutate(
      { id: consultation.id, input: parsed.data },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) =>
          setError(
            err instanceof ApiError && err.fields?.scheduled_at
              ? err.fields.scheduled_at[0]
              : err.message,
          ),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule consultation</DialogTitle>
          <DialogDescription>{consultation.reason}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="r-when">New date and time</Label>
            <Input
              id="r-when"
              type="datetime-local"
              min={toLocalInputValue(new Date())}
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
