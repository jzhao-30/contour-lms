/** The API and database use UTC ISO strings; only the UI converts to local time. */

/** Local date and time for display. */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** UTC ISO string to a datetime-local value (local time). */
export function toLocalInputValue(date: Date | string): string {
  const d = new Date(date);
  // datetime-local wants local wall-clock time, so shift by the offset
  const shifted = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

/** datetime-local value to a UTC ISO string ("" if empty). */
export function fromLocalInputValue(value: string): string {
  return value ? new Date(value).toISOString() : "";
}
