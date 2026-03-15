// used the fkg testing skill zioo
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteCalendarEvent,
  getCalendarEvents,
} from "@/app/_features/calendar/lib/calendar-client";

function createJsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });
}

function formatExpectedTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stubFetch(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("calendar client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("gets calendar events with daysAhead and returns raw events plus grouped days", async () => {
    const fetchMock = stubFetch();
    const startTime = "2026-03-14T09:00:00.000Z";

    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        events: [{ id: "evt-1", title: "Standup", startTime }],
        eventCount: 1,
        period: {
          from: "2026-03-14T00:00:00.000Z",
          to: "2026-03-15T00:00:00.000Z",
          daysAhead: 1,
        },
      }),
    );

    const result = await getCalendarEvents({ daysAhead: 1 });

    expect(fetchMock).toHaveBeenCalledWith("/api/calendar/events?daysAhead=1");
    expect(result).toEqual({
      success: true,
      events: [{ id: "evt-1", title: "Standup", startTime }],
      days: [
        {
          dateISO: "2026-03-14",
          events: [{ id: "evt-1", title: "Standup", time: formatExpectedTime(startTime) }],
        },
      ],
      eventCount: 1,
      period: {
        from: "2026-03-14T00:00:00.000Z",
        to: "2026-03-15T00:00:00.000Z",
        daysAhead: 1,
      },
    });
  });

  it("gets calendar events with explicit from/to dates", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        events: [],
        eventCount: 0,
        period: {
          from: "2026-03-14T00:00:00.000Z",
          to: "2026-03-16T00:00:00.000Z",
        },
      }),
    );

    await getCalendarEvents({
      from: new Date("2026-03-14T00:00:00.000Z"),
      to: new Date("2026-03-16T00:00:00.000Z"),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/calendar/events?from=2026-03-14T00%3A00%3A00.000Z&to=2026-03-16T00%3A00%3A00.000Z",
    );
  });

  it("returns a normalized error on calendar HTTP failures", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(
      createJsonResponse(
        {
          success: false,
          error: "CALENDAR_NOT_CONFIGURED",
          errorMessage: "Calendar non configurato",
        },
        { status: 503 },
      ),
    );

    const result = await getCalendarEvents({ daysAhead: 7 });

    expect(result).toEqual({
      success: false,
      error: "CALENDAR_NOT_CONFIGURED",
      errorMessage: "Calendar non configurato",
      status: 503,
    });
  });

  it("short-circuits invalid calendar queries without fetch", async () => {
    const fetchMock = stubFetch();

    const result = await getCalendarEvents({
      from: new Date("2026-03-14T00:00:00.000Z"),
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      error: "INVALID_QUERY",
      errorMessage: "Fornire entrambe le date oppure daysAhead",
      status: 400,
    });
  });

  it("deletes a calendar event", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        message: "Evento eliminato con successo",
      }),
    );

    const result = await deleteCalendarEvent({ eventId: "evt-1" });

    expect(fetchMock).toHaveBeenCalledWith("/api/calendar/events?eventId=evt-1", {
      method: "DELETE",
    });
    expect(result).toEqual({
      success: true,
      message: "Evento eliminato con successo",
    });
  });

  it("short-circuits invalid delete event payloads without fetch", async () => {
    const fetchMock = stubFetch();

    const result = await deleteCalendarEvent({ eventId: "   " });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      error: "INVALID_QUERY",
      errorMessage: "eventId: L'ID dell'evento è obbligatorio",
      status: 400,
    });
  });

  it("returns a normalized delete error on HTTP failures", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(
      createJsonResponse(
        {
          success: false,
          error: "DELETE_FAILED",
          errorMessage: "Delete fallita",
        },
        { status: 500 },
      ),
    );

    const result = await deleteCalendarEvent({ eventId: "evt-1" });

    expect(result).toEqual({
      success: false,
      error: "DELETE_FAILED",
      errorMessage: "Delete fallita",
      status: 500,
    });
  });
});
