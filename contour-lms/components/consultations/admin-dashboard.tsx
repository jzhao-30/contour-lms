"use client";

import { PAGINATION } from "@/lib/constants";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/datetime";
import type { ConsultationFilter } from "@/lib/validation/consultation";
import { FilterTabs, Pager } from "./list-controls";
import { StatusBadge } from "./status-badge";
import { useConsultations } from "./use-consultations";

/** Admin table: every consultation, read-only, from /api/admin/consultations. */
export function AdminDashboard() {
  const [filter, setFilter] = useState<ConsultationFilter>("all");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isFetching } = useConsultations(
    "all",
    { filter, page, page_size: PAGINATION.adminPageSize },
  );

  return (
    <div className="flex flex-col gap-4">
      <FilterTabs
        value={filter}
        onChange={(f) => {
          setFilter(f);
          setPage(1);
        }}
      />

      {isError && <p className="text-sm text-destructive">{error.message}</p>}

      <div className={isFetching ? "opacity-70 transition-opacity" : undefined}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Booked by</TableHead>
              <TableHead>Consultation for</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>When</TableHead>
              <TableHead>Status</TableHead>
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
                  No consultations found.
                </TableCell>
              </TableRow>
            )}
            {data?.data.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.student?.email ?? "—"}</TableCell>
                <TableCell>
                  {c.first_name} {c.last_name}
                </TableCell>
                <TableCell className="max-w-xs truncate">{c.reason}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDateTime(c.scheduled_at)}
                </TableCell>
                <TableCell>
                  <StatusBadge consultation={c} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && (
        <Pager
          page={page}
          pageSize={PAGINATION.adminPageSize}
          total={data.meta.total}
          onChange={setPage}
        />
      )}
    </div>
  );
}
