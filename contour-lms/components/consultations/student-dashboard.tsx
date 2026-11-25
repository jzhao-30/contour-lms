"use client";

import { PAGINATION } from "@/lib/constants";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/datetime";
import type { Consultation } from "@/lib/types";
import type { ConsultationFilter } from "@/lib/validation/consultation";
import { BookingDialog } from "./booking-dialog";
import { CancelDialog } from "./cancel-dialog";
import { FilterTabs, Pager } from "./list-controls";
import { RescheduleDialog } from "./reschedule-dialog";
import { StatusBadge } from "./status-badge";
import { useConsultations, useUpdateConsultation } from "./use-consultations";

/** One row; keeps its own dialog state. */
function Row({ c }: { c: Consultation }) {
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const update = useUpdateConsultation();

  const cancelled = c.status === "cancelled";
  // mirrors the DB rules: cancelled is final, completed can't be moved or cancelled.
  // the server enforces them too, this just avoids dead ends
  const canChange = !cancelled && !c.is_completed;

  return (
    <TableRow className={cancelled ? "opacity-60" : undefined}>
      <TableCell>
        <Checkbox
          aria-label={c.is_completed ? "Mark as incomplete" : "Mark as complete"}
          checked={c.is_completed}
          // cancelled ones can't be completed
          disabled={cancelled || update.isPending}
          onCheckedChange={(checked) =>
            update.mutate({
              id: c.id,
              input: { action: "set_completed", is_completed: checked === true },
            })
          }
        />
      </TableCell>
      <TableCell>
        <div className={c.is_completed ? "line-through" : undefined}>
          {c.reason}
        </div>
        <div className="text-xs text-muted-foreground">
          {c.first_name} {c.last_name}
        </div>
        {update.isError && (
          <div className="text-xs text-destructive">{update.error.message}</div>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {formatDateTime(c.scheduled_at)}
      </TableCell>
      <TableCell>
        <StatusBadge consultation={c} />
      </TableCell>
      <TableCell className="space-x-2 text-right whitespace-nowrap">
        <Button
          size="sm"
          variant="outline"
          disabled={!canChange}
          onClick={() => setRescheduling(true)}
        >
          Reschedule
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!canChange}
          onClick={() => setCancelling(true)}
        >
          Cancel
        </Button>

        {/* Mounted only while open so the reschedule form re-initialises from
            the latest scheduled_at each time it is opened. */}
        {rescheduling && (
          <RescheduleDialog
            consultation={c}
            open
            onOpenChange={setRescheduling}
          />
        )}
        {cancelling && (
          <CancelDialog consultation={c} open onOpenChange={setCancelling} />
        )}
      </TableCell>
    </TableRow>
  );
}

/** Student dashboard: list, filter, pager and the booking button. */
export function StudentDashboard({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) {
  const [filter, setFilter] = useState<ConsultationFilter>("all");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isFetching } = useConsultations(
    "mine",
    { filter, page, page_size: PAGINATION.studentPageSize },
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <FilterTabs
          value={filter}
          onChange={(f) => {
            setFilter(f);
            setPage(1); // the page count changes with the filter
          }}
        />
        <BookingDialog defaultFirstName={firstName} defaultLastName={lastName} />
      </div>

      {isError && <p className="text-sm text-destructive">{error.message}</p>}

      <div className={isFetching ? "opacity-70 transition-opacity" : undefined}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">Done</TableHead>
              <TableHead>Consultation</TableHead>
              <TableHead>When</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No consultations here yet.
                </TableCell>
              </TableRow>
            )}
            {data?.data.map((c) => <Row key={c.id} c={c} />)}
          </TableBody>
        </Table>
      </div>

      {data && (
        <Pager
          page={page}
          pageSize={PAGINATION.studentPageSize}
          total={data.meta.total}
          onChange={setPage}
        />
      )}
    </div>
  );
}
