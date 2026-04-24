// used the fkg testing skill zioo
import { describe, expect, it } from "vitest";
import { removeCalendarEventFromDays } from "./ui-events";
import type { UIDayEvents } from "./calendar-ui.types";

function createDaysFixture(): UIDayEvents[] {
  return [
    {
      dateISO: "2026-03-13",
      events: [
        { id: "evt-1", title: "Standup", time: "09:00" },
        { id: "evt-2", title: "Review", time: "11:00" },
      ],
    },
    {
      dateISO: "2026-03-14",
      events: [{ id: "evt-3", title: "Pranzo", time: "13:00" }],
    },
  ];
}

describe("removeCalendarEventFromDays", () => {
  it("removes an event while keeping the day group when other events remain", () => {
    const days = createDaysFixture();

    const result = removeCalendarEventFromDays(days, "evt-1");

    expect(result).toEqual([
      {
        dateISO: "2026-03-13",
        events: [{ id: "evt-2", title: "Review", time: "11:00" }],
      },
      {
        dateISO: "2026-03-14",
        events: [{ id: "evt-3", title: "Pranzo", time: "13:00" }],
      },
    ]);
  });

  it("removes the whole day group when deleting its last event", () => {
    const days = createDaysFixture();

    const result = removeCalendarEventFromDays(days, "evt-3");

    expect(result).toEqual([
      {
        dateISO: "2026-03-13",
        events: [
          { id: "evt-1", title: "Standup", time: "09:00" },
          { id: "evt-2", title: "Review", time: "11:00" },
        ],
      },
    ]);
  });

  it("keeps the same event data when the id does not exist", () => {
    const days = createDaysFixture();

    const result = removeCalendarEventFromDays(days, "evt-missing");

    expect(result).toEqual(days);
  });

  it("returns new immutable references for days and nested event arrays", () => {
    const days = createDaysFixture();

    const result = removeCalendarEventFromDays(days, "evt-missing");

    expect(result).not.toBe(days);
    expect(result[0]).not.toBe(days[0]);
    expect(result[0].events).not.toBe(days[0].events);
    expect(result[1]).not.toBe(days[1]);
    expect(result[1].events).not.toBe(days[1].events);
  });
});
