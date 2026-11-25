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
import { formatDateTime } from "@/lib/datetime";
import type { Consultation } from "@/lib/types";
import { useUpdateConsultation } from "./use-consultations";

/** Asks before cancelling, since a cancelled consultation can't change again. */
export function CancelDialog({
  consultation,
  open,
  onOpenChange,
}: {
  consultation: Consultation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateConsultation();

  const onConfirm = () => {
    setError(null);
    update.mutate(
      { id: consultation.id, input: { action: "cancel" } },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => setError(err.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this consultation?</DialogTitle>
          <DialogDescription>
            “{consultation.reason}” on {formatDateTime(consultation.scheduled_at)}.
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep it
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={update.isPending}
          >
            {update.isPending ? "Cancelling..." : "Cancel consultation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
