// used the fkg testing skill zioo
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UIDayEvents } from "@/app/_features/calendar";
import { getCalendarEvents } from "@/app/_features/calendar/lib/calendar-client";
import { useCalendarStore } from "./calendar.store";

vi.mock("@/app/_features/calendar/lib/calendar-client", () => ({
  getCalendarEvents: vi.fn(),
}));

function createDaysFixture(): UIDayEvents[] {
  return [
    {
      dateISO: "2026-03-14",
      events: [{ id: "evt-1", title: "Standup", time: "09:00" }],
    },
    {
      dateISO: "2026-03-15",
      events: [{ id: "evt-2", title: "Review", time: "10:00" }],
    },
  ];
}

describe("calendar store", () => {
  beforeEach(() => {
    useCalendarStore.setState({
      days: [],
      status: "idle",
      error: null,
      initialized: false,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("bootstraps SSR events", () => {
    const days = createDaysFixture();

    useCalendarStore.getState().initialize(days);

    expect(useCalendarStore.getState()).toMatchObject({
      days,
      status: "ready",
      error: null,
      initialized: true,
    });
  });

  it("refreshes events from the shared operation layer", async () => {
    const days = createDaysFixture();
    vi.mocked(getCalendarEvents).mockResolvedValue({
      success: true,
      events: [],
      days,
      eventCount: 2,
      period: {
        from: "2026-03-14T00:00:00.000Z",
        to: "2026-03-21T00:00:00.000Z",
        daysAhead: 7,
      },
    });

    const result = await useCalendarStore.getState().refresh();

    expect(getCalendarEvents).toHaveBeenCalledWith({ daysAhead: 7 });
    expect(result).toEqual(days);
    expect(useCalendarStore.getState().status).toBe("ready");
  });

  it("removes and applies event mutations immutably", () => {
    useCalendarStore.getState().initialize(createDaysFixture());

    useCalendarStore.getState().removeEvent("evt-1");
    expect(useCalendarStore.getState().days).toEqual([
      {
        dateISO: "2026-03-15",
        events: [{ id: "evt-2", title: "Review", time: "10:00" }],
      },
    ]);

    useCalendarStore.getState().applyEventMutationResult({
      days: createDaysFixture(),
    });
    expect(useCalendarStore.getState().days).toEqual(createDaysFixture());
  });

  it("stores operation errors on failed refresh", async () => {
    vi.mocked(getCalendarEvents).mockResolvedValue({
      success: false,
      error: "GET_CALENDAR_EVENTS_FAILED",
      errorMessage: "Boom calendar",
      status: 500,
    });

    const result = await useCalendarStore.getState().refresh();

    expect(result).toEqual([]);
    expect(useCalendarStore.getState()).toMatchObject({
      status: "error",
      error: "Boom calendar",
      initialized: true,
    });
  });
});
