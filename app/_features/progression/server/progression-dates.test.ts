import { describe, expect, it } from "vitest";
import {
  getIsoWeekdayForTimezone,
  getLocalDateForTimezone,
  getWeekRangeForLocalDate,
  isDeadlineExpired,
} from "./progression-dates";

describe("progression dates", () => {
  it("formats local dates for the browser timezone", () => {
    const date = new Date("2026-04-27T22:30:00.000Z");

    expect(getLocalDateForTimezone(date, "Europe/Rome")).toBe("2026-04-28");
    expect(getLocalDateForTimezone(date, "America/New_York")).toBe("2026-04-27");
  });

  it("maps ISO weekdays from Monday 1 through Sunday 7", () => {
    expect(getIsoWeekdayForTimezone(new Date("2026-04-27T12:00:00.000Z"), "UTC")).toBe(1);
    expect(getIsoWeekdayForTimezone(new Date("2026-05-03T12:00:00.000Z"), "UTC")).toBe(7);
  });

  it("returns Monday-to-Sunday ranges for a local date", () => {
    expect(getWeekRangeForLocalDate("2026-04-29")).toEqual({
      start: "2026-04-27",
      end: "2026-05-03",
    });
  });

  it("expires deadlines only after the end of the local deadline day", () => {
    expect(isDeadlineExpired(null, "2026-04-28")).toBe(false);
    expect(isDeadlineExpired("2026-04-28", "2026-04-28")).toBe(false);
    expect(isDeadlineExpired("2026-04-28", "2026-04-29")).toBe(true);
  });
});
