import { describe, expect, it } from "vitest";
import {
  createConsultationSchema,
  idSchema,
  listQuerySchema,
  updateConsultationSchema,
} from "@/lib/validation/consultation";

// Unit tests for the shared Zod schemas (no database).

const future = () => new Date(Date.now() + 86_400_000).toISOString();
const past = () => new Date(Date.now() - 86_400_000).toISOString();

describe("createConsultationSchema", () => {
  const valid = {
    first_name: "Sam",
    last_name: "Student",
    reason: "Course advice",
    scheduled_at: future(),
  };

  it("accepts a valid booking", () => {
    expect(createConsultationSchema.safeParse(valid).success).toBe(true);
  });

  it("trims whitespace and rejects blank fields", () => {
    const r = createConsultationSchema.safeParse({ ...valid, reason: "   " });
    expect(r.success).toBe(false);
  });

  it("rejects dates in the past", () => {
    const r = createConsultationSchema.safeParse({ ...valid, scheduled_at: past() });
    expect(r.success).toBe(false);
  });

  it("rejects timestamps without a timezone offset (ambiguous)", () => {
    const r = createConsultationSchema.safeParse({
      ...valid,
      scheduled_at: "2099-01-01T10:00:00",
    });
    expect(r.success).toBe(false);
  });

  it("rejects over-long input", () => {
    const r = createConsultationSchema.safeParse({ ...valid, reason: "x".repeat(1001) });
    expect(r.success).toBe(false);
  });

  it("strips unknown keys, so student_id/status can't be smuggled in", () => {
    const r = createConsultationSchema.parse({
      ...valid,
      student_id: "someone-else",
      status: "cancelled",
    });
    expect(r).not.toHaveProperty("student_id");
    expect(r).not.toHaveProperty("status");
  });
});

describe("updateConsultationSchema", () => {
  it("accepts each supported action", () => {
    expect(updateConsultationSchema.safeParse({ action: "cancel" }).success).toBe(true);
    expect(
      updateConsultationSchema.safeParse({ action: "set_completed", is_completed: true })
        .success,
    ).toBe(true);
    expect(
      updateConsultationSchema.safeParse({ action: "reschedule", scheduled_at: future() })
        .success,
    ).toBe(true);
  });

  it("rejects unknown actions and missing payloads", () => {
    expect(updateConsultationSchema.safeParse({ action: "delete" }).success).toBe(false);
    expect(updateConsultationSchema.safeParse({ action: "reschedule" }).success).toBe(false);
    expect(
      updateConsultationSchema.safeParse({ action: "set_completed", is_completed: "yes" })
        .success,
    ).toBe(false);
  });
});

describe("idSchema / listQuerySchema", () => {
  it("only accepts UUIDs as ids", () => {
    expect(idSchema.safeParse("not-a-uuid").success).toBe(false);
    expect(idSchema.safeParse("22222222-2222-4222-8222-222222222222").success).toBe(true);
  });

  it("applies defaults and coerces query-string numbers", () => {
    expect(listQuerySchema.parse({})).toEqual({ filter: "all", page: 1, page_size: 20 });
    expect(listQuerySchema.parse({ page: "3", page_size: "5" })).toMatchObject({
      page: 3,
      page_size: 5,
    });
  });

  it("caps page_size and rejects bad filters", () => {
    expect(listQuerySchema.safeParse({ page_size: "1000" }).success).toBe(false);
    expect(listQuerySchema.safeParse({ filter: "everything" }).success).toBe(false);
    expect(listQuerySchema.safeParse({ page: "0" }).success).toBe(false);
  });
});
