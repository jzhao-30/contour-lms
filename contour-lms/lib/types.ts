import type { Database } from "@/lib/database.types";

/** A consultation as the API returns it: the row plus the booking account. */
export type Consultation =
  Database["public"]["Tables"]["consultations"]["Row"] & {
    student: { email: string; first_name: string; last_name: string } | null;
  };

/** Envelope for paginated lists. */
export type Paged<T> = {
  data: T[];
  meta: { page: number; page_size: number; total: number };
};
