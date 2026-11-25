"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/datetime";
import { createConsultationSchema } from "@/lib/validation/consultation";
import { useCreateConsultation } from "./use-consultations";

type Errors = Record<string, string[] | undefined>;

/** Booking form. The names are pre-filled from the profile but can be edited. */
export function BookingDialog({
  defaultFirstName,
  defaultLastName,
}: {
  defaultFirstName: string;
  defaultLastName: string;
}) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [reason, setReason] = useState("");
  const [when, setWhen] = useState(""); // datetime-local value (local time)
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const create = useCreateConsultation();

  const reset = () => {
    setFirstName(defaultFirstName);
    setLastName(defaultLastName);
    setReason("");
    setWhen("");
    setErrors({});
    setFormError(null);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // same schema as the API
    const parsed = createConsultationSchema.safeParse({
      first_name: firstName,
      last_name: lastName,
      reason,
      scheduled_at: fromLocalInputValue(when),
    });
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }
    setErrors({});

    create.mutate(parsed.data, {
      onSuccess: () => {
        setOpen(false);
        reset();
      },
      // the server has the final say, so show its field errors
      onError: (err) => {
        if (err instanceof ApiError && err.fields) setErrors(err.fields);
        else setFormError(err.message);
      },
    });
  };

  const fieldError = (name: string) =>
    errors[name]?.[0] && (
      <p className="text-sm text-destructive">{errors[name]![0]}</p>
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Book consultation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book a consultation</DialogTitle>
          <DialogDescription>
            Tell us who it is for, why, and when.
          </DialogDescription>
        </DialogHeader>

        {/* noValidate: we show our own (Zod) messages instead of the browser's. */}
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="b-first">First name</Label>
              <Input
                id="b-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              {fieldError("first_name")}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="b-last">Last name</Label>
              <Input
                id="b-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
              {fieldError("last_name")}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="b-reason">Reason for consultation</Label>
            <Textarea
              id="b-reason"
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {fieldError("reason")}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="b-when">Date and time</Label>
            <Input
              id="b-when"
              type="datetime-local"
              // hint only, the server checks that it's in the future
              min={toLocalInputValue(new Date())}
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
            {fieldError("scheduled_at")}
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Booking..." : "Book"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
