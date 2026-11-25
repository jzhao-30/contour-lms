import "server-only";
import type { NextResponse } from "next/server";
import type { z } from "zod";
import { apiError, validationError } from "@/lib/api/response";

/**
 * Parses and validates a JSON body. Returns the data, or an error response to return as
 * is (like requireAuth). Bad JSON is a 400, a schema failure a 422 with per-field messages.
 *   const body = await parseBody(request, schema);
 *   if (body instanceof Response) return body;
 */
export async function parseBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.output<S> | NextResponse> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON");
  }
  const parsed = schema.safeParse(json);
  return parsed.success ? parsed.data : validationError(parsed.error);
}

/** Same for the query string. */
export function parseQuery<S extends z.ZodType>(
  request: Request,
  schema: S,
): z.output<S> | NextResponse {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = schema.safeParse(params);
  return parsed.success ? parsed.data : validationError(parsed.error);
}
