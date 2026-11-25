import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/database.types";

/**
 * Security tests against the local database (needs `npm run db:start`). They sign in as the
 * seed users with the same client and key as the app, so they show what each role can and
 * can't do: RLS, column grants and the business-rule trigger.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
type Client = SupabaseClient<Database>;

/** A client signed in as this user. */
async function signIn(email: string): Promise<Client> {
  const client = createClient<Database>(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email,
    password: "Password123!",
  });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return client;
}

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

let anon: Client;
let admin: Client;
let student1: Client;
let student2: Client;
let student1Id: string;
let student2Id: string;
const createdIds: string[] = []; // rows made by these tests, removed in afterAll

/** Books a consultation as student1 and remembers it for cleanup. */
async function bookAsStudent1(reason = "[test] booking") {
  const { data, error } = await student1
    .from("consultations")
    .insert({
      student_id: student1Id,
      first_name: "Sam",
      last_name: "Student",
      reason,
      scheduled_at: inDays(7),
    })
    .select()
    .single();
  expect(error).toBeNull();
  createdIds.push(data!.id);
  return data!;
}

beforeAll(async () => {
  anon = createClient<Database>(URL, KEY, { auth: { persistSession: false } });
  [admin, student1, student2] = await Promise.all([
    signIn("admin@example.com"),
    signIn("student1@example.com"),
    signIn("student2@example.com"),
  ]);
  student1Id = (await student1.auth.getUser()).data.user!.id;
  student2Id = (await student2.auth.getUser()).data.user!.id;
});

afterAll(async () => {
  // users can't delete rows, so use the service-role key if given, else `npm run db:reset`
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || createdIds.length === 0) return;
  const service = createClient<Database>(URL, serviceKey);
  await service.from("consultations").delete().in("id", createdIds);
});

describe("anonymous visitors", () => {
  it("cannot read consultations or profiles", async () => {
    // anon has no grant, so this is permission denied rather than zero rows
    const c = await anon.from("consultations").select("id");
    const p = await anon.from("profiles").select("id");
    expect(c.error).not.toBeNull();
    expect(p.error).not.toBeNull();
  });
});

describe("student: row isolation (RLS)", () => {
  it("sees only their own consultations", async () => {
    await bookAsStudent1("[test] isolation");
    const { data, error } = await student2.from("consultations").select("*");
    expect(error).toBeNull();
    expect(data!.every((c) => c.student_id === student2Id)).toBe(true);
  });

  it("cannot read another student's row by id", async () => {
    const mine = await bookAsStudent1("[test] by-id");
    const { data } = await student2
      .from("consultations")
      .select("*")
      .eq("id", mine.id);
    expect(data).toEqual([]);
  });

  it("cannot create a consultation for someone else", async () => {
    const { error } = await student1.from("consultations").insert({
      student_id: student2Id, // forged owner
      first_name: "X",
      last_name: "Y",
      reason: "[test] forged",
      scheduled_at: inDays(3),
    });
    expect(error).not.toBeNull(); // blocked by the INSERT policy
  });

  it("cannot update another student's consultation", async () => {
    const mine = await bookAsStudent1("[test] cross-update");
    const { data } = await student2
      .from("consultations")
      .update({ is_completed: true })
      .eq("id", mine.id)
      .select();
    expect(data).toEqual([]); // 0 rows affected: invisible to them
  });

  it("cannot delete anything", async () => {
    const mine = await bookAsStudent1("[test] no-delete");
    const { error } = await student1.from("consultations").delete().eq("id", mine.id);
    expect(error).not.toBeNull(); // no DELETE grant
    const { data } = await student1.from("consultations").select("id").eq("id", mine.id);
    expect(data).toHaveLength(1); // still there
  });
});

describe("student: column privileges", () => {
  it("cannot promote themselves to admin", async () => {
    const { error } = await student1
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", student1Id);
    expect(error).not.toBeNull(); // `role` is not an updatable column
    const { data } = await student1.from("profiles").select("role").eq("id", student1Id).single();
    expect(data!.role).toBe("student");
  });

  it("cannot reassign a consultation to another user", async () => {
    const mine = await bookAsStudent1("[test] reassign");
    const { error } = await student1
      .from("consultations")
      .update({ student_id: student2Id })
      .eq("id", mine.id);
    expect(error).not.toBeNull(); // `student_id` is not an updatable column
  });

  it("cannot set status/is_completed at creation time", async () => {
    const { error } = await student1.from("consultations").insert({
      student_id: student1Id,
      first_name: "A",
      last_name: "B",
      reason: "[test] sneaky",
      scheduled_at: inDays(2),
      status: "cancelled",
    });
    expect(error).not.toBeNull();
  });

  it("can edit their own display name", async () => {
    const { error } = await student1
      .from("profiles")
      .update({ first_name: "Sam" })
      .eq("id", student1Id);
    expect(error).toBeNull();
  });
});

describe("admin: read-only access to everything", () => {
  it("sees consultations from every student", async () => {
    await bookAsStudent1("[test] admin-sees");
    const { data, error } = await admin.from("consultations").select("student_id");
    expect(error).toBeNull();
    const owners = new Set(data!.map((c) => c.student_id));
    // the seed gives each student at least one booking
    expect(owners.has(student1Id)).toBe(true);
    expect(owners.has(student2Id)).toBe(true);
  });

  it("can see all profiles (to show who booked)", async () => {
    const { data } = await admin.from("profiles").select("email");
    expect(data!.length).toBeGreaterThanOrEqual(3);
  });

  it("cannot create consultations, not even for themselves", async () => {
    const adminId = (await admin.auth.getUser()).data.user!.id;
    const { error } = await admin.from("consultations").insert({
      student_id: adminId, // passes the "own row" check; only the role blocks it
      first_name: "A",
      last_name: "A",
      reason: "[test] admin write",
      scheduled_at: inDays(2),
    });
    expect(error).not.toBeNull(); // read-only is enforced by RLS, not just the API
  });

  it("cannot modify other users' consultations", async () => {
    const mine = await bookAsStudent1("[test] admin-update");
    const { data } = await admin
      .from("consultations")
      .update({ is_completed: true })
      .eq("id", mine.id)
      .select();
    expect(data).toEqual([]); // UPDATE policy only matches the caller's own rows
  });
});

describe("business rules (DB trigger)", () => {
  it("rejects bookings in the past", async () => {
    const { error } = await student1.from("consultations").insert({
      student_id: student1Id,
      first_name: "A",
      last_name: "B",
      reason: "[test] past",
      scheduled_at: inDays(-1),
    });
    expect(error?.code).toBe("23514");
  });

  it("allows reschedule to a future time, and bumps updated_at", async () => {
    const c = await bookAsStudent1("[test] reschedule");
    const { data, error } = await student1
      .from("consultations")
      .update({ scheduled_at: inDays(10) })
      .eq("id", c.id)
      .select()
      .single();
    expect(error).toBeNull();
    expect(new Date(data!.scheduled_at).getTime()).toBeGreaterThan(new Date(c.scheduled_at).getTime());
    expect(new Date(data!.updated_at).getTime()).toBeGreaterThanOrEqual(new Date(c.updated_at).getTime());
  });

  it("rejects rescheduling into the past", async () => {
    const c = await bookAsStudent1("[test] reschedule-past");
    const { error } = await student1
      .from("consultations")
      .update({ scheduled_at: inDays(-2) })
      .eq("id", c.id);
    expect(error?.code).toBe("23514");
  });

  it("toggles completion on and off", async () => {
    const c = await bookAsStudent1("[test] toggle");
    const on = await student1.from("consultations").update({ is_completed: true }).eq("id", c.id).select().single();
    expect(on.data!.is_completed).toBe(true);
    const off = await student1.from("consultations").update({ is_completed: false }).eq("id", c.id).select().single();
    expect(off.data!.is_completed).toBe(false);
  });

  it("cancellation is final: no reschedule, no completion afterwards", async () => {
    const c = await bookAsStudent1("[test] cancel-final");
    const cancel = await student1.from("consultations").update({ status: "cancelled" }).eq("id", c.id);
    expect(cancel.error).toBeNull();

    const resched = await student1.from("consultations").update({ scheduled_at: inDays(20) }).eq("id", c.id);
    expect(resched.error?.code).toBe("23514");

    const complete = await student1.from("consultations").update({ is_completed: true }).eq("id", c.id);
    expect(complete.error?.code).toBe("23514");
  });

  it("a completed consultation can't be cancelled or moved until un-ticked", async () => {
    const c = await bookAsStudent1("[test] completed-locked");
    await student1.from("consultations").update({ is_completed: true }).eq("id", c.id);

    const cancel = await student1.from("consultations").update({ status: "cancelled" }).eq("id", c.id);
    expect(cancel.error).not.toBeNull();

    const resched = await student1.from("consultations").update({ scheduled_at: inDays(15) }).eq("id", c.id);
    expect(resched.error?.code).toBe("23514");
  });
});
