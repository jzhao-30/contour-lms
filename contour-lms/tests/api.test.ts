import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Consultation } from "@/lib/types";
import { API, ROUTES } from "@/lib/routes";
import { call, inDays, send, signInCookie, startApp } from "./helpers/app";

/**
 * API and page tests over real HTTP against the running app: session cookie, proxy, route
 * handler, Supabase. Needs `npm run db:start`; the Next server is started if it isn't
 * already running. Uses the seed users.
 */

const STUDENT1_ID = "22222222-2222-2222-2222-222222222222";

let stopApp: () => void;
let student: string; // session cookies
let otherStudent: string;
let admin: string;
const createdIds: string[] = []; // rows to clean up in afterAll

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const json = async (res: Response) => (await res.json()) as Json;

/** Books a consultation as student1; each test gets its own row. */
async function book(reason = "[api-test] booking"): Promise<Consultation> {
  const res = await send("POST", API.consultations, student, {
    first_name: "Sam",
    last_name: "Student",
    reason,
    scheduled_at: inDays(5),
  });
  expect(res.status).toBe(201);
  const { data } = await json(res);
  createdIds.push(data.id);
  return data;
}

const patch = (id: string, body: unknown, cookie = student) =>
  send("PATCH", API.consultation(id), cookie, body);

beforeAll(async () => {
  stopApp = await startApp();
  [student, otherStudent, admin] = await Promise.all([
    signInCookie("student1@example.com"),
    signInCookie("student2@example.com"),
    signInCookie("admin@example.com"),
  ]);
}, 120_000);

afterAll(async () => {
  stopApp?.();
  // users can't delete rows, so use the service-role key if given, else `npm run db:reset`
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || createdIds.length === 0) return;
  await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
    .from("consultations")
    .delete()
    .in("id", createdIds);
});

describe("health check", () => {
  it("is public and answers 200 without a session (used by the load balancer)", async () => {
    const res = await call(API.health);
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({ status: "ok" });
  });
});

describe("authentication", () => {
  it("rejects API calls without a session (401)", async () => {
    const res = await call(API.consultations);
    expect(res.status).toBe(401);
    expect((await json(res)).error.code).toBe("unauthorized");
  });
});

describe("student: list and book", () => {
  it("lists only their own consultations", async () => {
    const res = await call(API.consultations, student);
    expect(res.status).toBe(200);
    const { data } = await json(res);
    expect(data.every((c: Consultation) => c.student?.email === "student1@example.com")).toBe(true);
  });

  it("books a consultation (scheduled, not completed)", async () => {
    const c = await book();
    expect(c.status).toBe("scheduled");
    expect(c.is_completed).toBe(false);
  });

  it("ignores a forged student_id: the owner is always the caller", async () => {
    const res = await send("POST", API.consultations, student, {
      first_name: "A",
      last_name: "B",
      reason: "[api-test] forged",
      scheduled_at: inDays(6),
      student_id: "33333333-3333-3333-3333-333333333333", // student2
    });
    expect(res.status).toBe(201);
    const { data } = await json(res);
    createdIds.push(data.id);
    expect(data.student_id).toBe(STUDENT1_ID);
  });

  it("rejects a booking in the past (422 with field errors)", async () => {
    const res = await send("POST", API.consultations, student, {
      first_name: "A",
      last_name: "B",
      reason: "x",
      scheduled_at: inDays(-1),
    });
    expect(res.status).toBe(422);
    const body = await json(res);
    expect(body.error.code).toBe("validation_error");
    expect(body.error.details.fields.scheduled_at).toBeDefined();
  });

  it("rejects malformed JSON (400)", async () => {
    const res = await call(API.consultations, student, { method: "POST", body: "{nope" });
    expect(res.status).toBe(400);
  });

  it("caps page_size (422)", async () => {
    expect((await call(`${API.consultations}?page_size=1000`, student)).status).toBe(422);
  });
});

describe("student: manage a consultation", () => {
  it("reschedules", async () => {
    const c = await book();
    const res = await patch(c.id, { action: "reschedule", scheduled_at: inDays(9) });
    expect(res.status).toBe(200);
    const { data } = await json(res);
    expect(new Date(data.scheduled_at).getTime()).toBeGreaterThan(new Date(c.scheduled_at).getTime());
  });

  it("marks complete and incomplete", async () => {
    const c = await book();
    const on = await patch(c.id, { action: "set_completed", is_completed: true });
    expect((await json(on)).data.is_completed).toBe(true);
    const off = await patch(c.id, { action: "set_completed", is_completed: false });
    expect((await json(off)).data.is_completed).toBe(false);
  });

  it("cancels (soft delete) and it shows under filter=cancelled", async () => {
    const c = await book();
    const res = await patch(c.id, { action: "cancel" });
    expect(res.status).toBe(200);
    expect((await json(res)).data.status).toBe("cancelled");

    const list = await json(await call(`${API.consultations}?filter=cancelled&page_size=50`, student));
    expect(list.data.some((x: Consultation) => x.id === c.id)).toBe(true);
  });

  it("a completed consultation can't be cancelled (409 rule_violation)", async () => {
    const c = await book();
    await patch(c.id, { action: "set_completed", is_completed: true });
    const res = await patch(c.id, { action: "cancel" });
    expect(res.status).toBe(409);
    expect((await json(res)).error.code).toBe("rule_violation");
  });

  it("a cancelled consultation can't be rescheduled (409)", async () => {
    const c = await book();
    await patch(c.id, { action: "cancel" });
    const res = await patch(c.id, { action: "reschedule", scheduled_at: inDays(12) });
    expect(res.status).toBe(409);
  });

  it("rejects an unknown action (422) and a non-UUID id (404)", async () => {
    const c = await book();
    expect((await patch(c.id, { action: "delete" })).status).toBe(422);
    expect((await patch("abc", { action: "cancel" })).status).toBe(404);
  });
});

describe("isolation between students", () => {
  it("another student gets 404 on someone else's consultation (no id probing)", async () => {
    const c = await book();
    const res = await patch(c.id, { action: "cancel" }, otherStudent);
    expect(res.status).toBe(404);
  });

  it("another student doesn't see it in their list", async () => {
    const c = await book();
    const { data } = await json(await call(`${API.consultations}?page_size=50`, otherStudent));
    expect(data.some((x: Consultation) => x.id === c.id)).toBe(false);
  });
});

describe("RBAC: student vs admin", () => {
  it("students are blocked from the admin API (403)", async () => {
    expect((await call(API.adminConsultations, student)).status).toBe(403);
  });

  it("admin lists consultations from every student", async () => {
    const res = await call(`${API.adminConsultations}?page_size=50`, admin);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(new Set(body.data.map((c: Consultation) => c.student_id)).size).toBeGreaterThanOrEqual(2);
    expect(body.meta.total).toBeGreaterThanOrEqual(3);
  });

  it("admin is read-only: can't book (403) or modify (403)", async () => {
    const c = await book();
    const create = await send("POST", API.consultations, admin, {
      first_name: "A",
      last_name: "B",
      reason: "x",
      scheduled_at: inDays(3),
    });
    expect(create.status).toBe(403);
    expect((await patch(c.id, { action: "cancel" }, admin)).status).toBe(403);
  });
});

describe("pages: redirects by role", () => {
  const location = async (path: string, cookie?: string) => {
    const res = await call(path, cookie);
    return { status: res.status, location: res.headers.get("location") ?? "" };
  };

  it("signed out -> login", async () => {
    const r = await location(ROUTES.dashboard);
    expect(r.status).toBe(307);
    expect(r.location).toContain(ROUTES.login);
  });

  it("student sees /dashboard but is sent away from /admin", async () => {
    expect((await location(ROUTES.dashboard, student)).status).toBe(200);
    const r = await location(ROUTES.admin, student);
    expect(r.status).toBe(307);
    expect(r.location).toContain(ROUTES.dashboard);
  });

  it("admin sees /admin but is sent away from /dashboard; '/' routes by role", async () => {
    expect((await location(ROUTES.admin, admin)).status).toBe(200);
    expect((await location(ROUTES.dashboard, admin)).location).toContain(ROUTES.admin);
    expect((await location(ROUTES.home, admin)).location).toContain(ROUTES.admin);
  });
});
