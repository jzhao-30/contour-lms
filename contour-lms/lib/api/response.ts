import "server-only";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/** Every error has the same shape: { error: { code, message, details? } }. */
export function apiError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}

export const unauthorized = () =>
  apiError(401, "unauthorized", "You must be signed in");
export const forbidden = () =>
  apiError(403, "forbidden", "You do not have permission to do this");
export const notFound = () => apiError(404, "not_found", "Not found");

/** 422 with per-field messages. */
export function validationError(error: ZodError) {
  return apiError(422, "validation_error", "Invalid input", {
    fields: error.flatten().fieldErrors,
  });
}

/** Shape of a PostgREST error. */
type DbError = { code?: string; message?: string };

/**
 * Maps database errors to HTTP. 23514 is our trigger rejecting a rule (409; the message is
 * ours, so it is safe to show). 42501 is a GRANT/RLS denial (403). Anything else is logged
 * and returned as a generic 500 so internals don't leak.
 */
export function dbError(error: DbError) {
  if (error.code === "23514") {
    return apiError(409, "rule_violation", error.message ?? "Rule violated");
  }
  if (error.code === "42501") return forbidden();
  console.error("[api] database error:", error);
  return apiError(500, "internal_error", "Something went wrong");
}
