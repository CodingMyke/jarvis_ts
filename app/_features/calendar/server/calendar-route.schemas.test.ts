// used the fkg testing skill zioo
import { describe, expect, it } from "vitest";
import {
  calendarCreateBodySchema,
  calendarGetQuerySchema,
  resolveCalendarRange,
} from "./calendar-route.schemas";

describe("calendar route schemas", () => {
  it("accepts daysAhead-only queries", () => {
    const parsed = calendarGetQuerySchema.safeParse({ daysAhead: "7" });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const range = resolveCalendarRange(parsed.data);
      expect(range.to.getTime()).toBeGreaterThan(range.from.getTime());
    }
  });

  it("rejects partial date ranges", () => {
    const parsed = calendarGetQuerySchema.safeParse({ from: new Date().toISOString() });

    expect(parsed.success).toBe(false);
  });

  it("rejects end dates before start dates on create", () => {
    const parsed = calendarCreateBodySchema.safeParse({
      title: "Review",
      startTime: "2026-03-14T10:00:00.000Z",
      endTime: "2026-03-14T09:00:00.000Z",
    });

    expect(parsed.success).toBe(false);
  });
});
