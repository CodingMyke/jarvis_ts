// used the fkg testing skill zioo
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UIDayEvents } from "@/app/_features/calendar";
import { useCalendarStore } from "./calendar.store";

function formatExpectedTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

function createJsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });
}

describe("calendar store", () => {
  beforeEach(() => {
    useCalendarStore.setState({
      days: [],
      status: "idle",
      error: null,
      initialized: false,
    });
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

  it("refreshes events from the API", async () => {
    const startTime = "2026-03-14T09:00:00.000Z";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createJsonResponse({
          success: true,
          events: [
            {
              id: "evt-1",
              title: "Standup",
              startTime,
            },
          ],
        }),
      ),
    );

    const result = await useCalendarStore.getState().refresh();

    expect(result).toEqual([
      {
        dateISO: "2026-03-14",
        events: [{ id: "evt-1", title: "Standup", time: formatExpectedTime(startTime) }],
      },
    ]);
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

  it("stores API errors on failed refresh", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createJsonResponse(
          { success: false, message: "Boom calendar" },
          { status: 500 },
        ),
      ),
    );

    const result = await useCalendarStore.getState().refresh();

    expect(result).toEqual([]);
    expect(useCalendarStore.getState()).toMatchObject({
      status: "error",
      error: "Boom calendar",
      initialized: true,
    });
  });
});
