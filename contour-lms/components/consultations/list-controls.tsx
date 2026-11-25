"use client";

import { Button } from "@/components/ui/button";
import type { ConsultationFilter } from "@/lib/validation/consultation";

const LABELS: Record<ConsultationFilter, string> = {
  all: "All",
  upcoming: "Upcoming",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Filter buttons for both lists. */
export function FilterTabs({
  value,
  onChange,
}: {
  value: ConsultationFilter;
  onChange: (value: ConsultationFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter">
      {(Object.keys(LABELS) as ConsultationFilter[]).map((key) => (
        <Button
          key={key}
          role="tab"
          aria-selected={value === key}
          size="sm"
          variant={value === key ? "default" : "outline"}
          onClick={() => onChange(key)}
        >
          {LABELS[key]}
        </Button>
      ))}
    </div>
  );
}

/** Previous/next pager driven by the API's meta. */
export function Pager({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        {total} {total === 1 ? "consultation" : "consultations"} · page {page} of{" "}
        {pages}
      </span>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
