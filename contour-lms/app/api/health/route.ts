import { NextResponse } from "next/server";

// never cache
export const dynamic = "force-dynamic";

/**
 * GET /api/health: liveness probe. Public, and it doesn't query the database, so a
 * Supabase outage doesn't get every container marked unhealthy and restarted.
 */
export function GET() {
  return NextResponse.json({ status: "ok" });
}
