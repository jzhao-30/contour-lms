import type { Database } from "@/lib/database.types";

/** Roles. The type comes from the database enum, so a mismatch fails to compile. */
export type UserRole = Database["public"]["Enums"]["user_role"];

export const ROLES = {
  student: "student",
  admin: "admin",
} as const satisfies Record<string, UserRole>;
