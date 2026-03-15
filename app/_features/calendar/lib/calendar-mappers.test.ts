// used the fkg testing skill zioo
import { describe, expect, it } from "vitest";
import { groupCalendarEventsByDay, toUICalendarEvent } from "./calendar-mappers";

function formatExpectedTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

describe("calendar mappers", () => {
  it("maps API events into UI events", () => {
    const startTime = "2026-03-14T08:30:00.000Z";
    const endTime = "2026-03-14T09:00:00.000Z";

    expect(
      toUICalendarEvent({
        id: "evt-1",
        title: "Call",
        startTime,
        endTime,
        description: "Sync",
      }),
    ).toEqual({
      id: "evt-1",
      title: "Call",
      time: formatExpectedTime(startTime),
      endTime: formatExpectedTime(endTime),
      description: "Sync",
    });
  });

  it("groups UI events by day", () => {
    const reviewTime = "2026-03-15T10:00:00.000Z";
    const standupTime = "2026-03-14T08:00:00.000Z";

    expect(
      groupCalendarEventsByDay([
        {
          id: "evt-2",
          title: "Review",
          startTime: reviewTime,
        },
        {
          id: "evt-1",
          title: "Standup",
          startTime: standupTime,
        },
      ]),
    ).toEqual([
      {
        dateISO: "2026-03-14",
        events: [{ id: "evt-1", title: "Standup", time: formatExpectedTime(standupTime) }],
      },
      {
        dateISO: "2026-03-15",
        events: [{ id: "evt-2", title: "Review", time: formatExpectedTime(reviewTime) }],
      },
    ]);
  });
});
