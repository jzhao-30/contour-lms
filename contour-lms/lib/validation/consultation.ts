import { z } from "zod";
import { PAGINATION } from "@/lib/constants";

/**
 * Zod schemas shared by the forms (instant feedback) and the API (the check that counts).
 * Field names are snake_case everywhere, so there is no mapping layer.
 */

// ISO timestamp with a timezone offset, so the server never guesses a timezone
const futureDatetime = z.iso
  .datetime({ offset: true, message: "Enter a valid date and time" })
  .refine((v) => new Date(v).getTime() > Date.now(), {
    message: "The date and time must be in the future",
  });

const name = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(100, `${label} must be at most 100 characters`);

/** POST /api/consultations */
export const createConsultationSchema = z.object({
  first_name: name("First name"),
  last_name: name("Last name"),
  reason: z
    .string()
    .trim()
    .min(1, "Reason is required")
    .max(1000, "Reason must be at most 1000 characters"),
  scheduled_at: futureDatetime,
});
export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;

/** PATCH /api/consultations/:id. One payload per action, so a request can't slip in other changes. */
export const updateConsultationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reschedule"), scheduled_at: futureDatetime }),
  z.object({ action: z.literal("set_completed"), is_completed: z.boolean() }),
  z.object({ action: z.literal("cancel") }),
]);
export type UpdateConsultationInput = z.infer<typeof updateConsultationSchema>;

/** Ids are UUIDs; anything else is rejected before the database. */
export const idSchema = z.uuid();

/** Query string for the list endpoints (?filter=upcoming&page=1&page_size=20). */
export const CONSULTATION_FILTERS = [
  "all",
  "upcoming",
  "completed",
  "cancelled",
] as const;
export type ConsultationFilter = (typeof CONSULTATION_FILTERS)[number];

export const listQuerySchema = z.object({
  filter: z.enum(CONSULTATION_FILTERS).default("all"),
  // query-string values arrive as strings
  page: z.coerce.number().int().min(1).default(1),
  // upper bound so nobody can ask for everything
  page_size: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.maxPageSize)
    .default(PAGINATION.defaultPageSize),
});
export type ListQuery = z.infer<typeof listQuerySchema>;
