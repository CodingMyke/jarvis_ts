// used the fkg testing skill zioo
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("calendar server actions", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches and groups calendar events, returning an empty list on failure", async () => {
    const getEvents = vi
      .fn()
      .mockResolvedValueOnce({
        events: [
          {
            id: "event-1",
            title: "Riunione",
            startTime: new Date("2026-03-15T09:00:00.000Z"),
          },
        ],
      })
      .mockRejectedValueOnce(new Error("calendar down assistant"));
    const getCalendarService = vi.fn(() => ({ getEvents }));
    const groupCalendarEventsByDay = vi.fn().mockReturnValue([{ date: "2026-03-15", events: [] }]);

    vi.doMock("@/app/_features/calendar/server/calendar.service", () => ({
      getCalendarService,
    }));
    vi.doMock("@/app/_features/calendar/lib/calendar-mappers", () => ({
      groupCalendarEventsByDay,
    }));

    const { fetchCalendarEvents } = await import("./actions");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(fetchCalendarEvents({ maxResults: 10 })).resolves.toEqual([
      { date: "2026-03-15", events: [] },
    ]);
    await expect(fetchCalendarEvents()).resolves.toEqual([]);

    expect(getEvents).toHaveBeenCalledWith({ maxResults: 10 });
    expect(groupCalendarEventsByDay).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("returns dashboard calendar data with explicit error signaling", async () => {
    const getEvents = vi
      .fn()
      .mockResolvedValueOnce({
        events: [
          {
            id: "event-1",
            title: "Riunione",
            startTime: new Date("2026-03-15T09:00:00.000Z"),
          },
        ],
      })
      .mockRejectedValueOnce(new Error("calendar down dashboard"));
    const getCalendarService = vi.fn(() => ({ getEvents }));
    const groupCalendarEventsByDay = vi.fn().mockReturnValue([{ date: "2026-03-15", events: [] }]);

    vi.doMock("@/app/_features/calendar/server/calendar.service", () => ({
      getCalendarService,
    }));
    vi.doMock("@/app/_features/calendar/lib/calendar-mappers", () => ({
      groupCalendarEventsByDay,
    }));

    const { fetchDashboardCalendarEvents } = await import("./actions");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(fetchDashboardCalendarEvents({ maxResults: 10 })).resolves.toEqual({
      days: [{ date: "2026-03-15", events: [] }],
      hasError: false,
    });
    await expect(fetchDashboardCalendarEvents()).resolves.toEqual({
      days: [],
      hasError: true,
    });

    expect(getEvents).toHaveBeenCalledWith({ maxResults: 10 });
    expect(groupCalendarEventsByDay).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("validates create requests and surfaces service results", async () => {
    const createEvent = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        event: {
          id: "event-1",
          title: "Riunione",
          startTime: new Date("2026-03-15T09:00:00.000Z"),
        },
      })
      .mockRejectedValueOnce(new Error("save failed"));
    const getCalendarService = vi.fn(() => ({ createEvent }));

    vi.doMock("@/app/_features/calendar/server/calendar.service", () => ({
      getCalendarService,
    }));
    vi.doMock("@/app/_features/calendar/lib/calendar-mappers", () => ({
      groupCalendarEventsByDay: vi.fn(),
    }));

    const { createCalendarEvent } = await import("./actions");
    const startTime = new Date("2026-03-15T09:00:00.000Z");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(createCalendarEvent({ title: " ", startTime })).resolves.toEqual({
      success: false,
      error: "Il titolo dell'evento è obbligatorio",
      event: {
        id: "",
        title: "",
        startTime,
      },
    });
    await expect(createCalendarEvent({ title: "x".repeat(501), startTime })).resolves.toEqual({
      success: false,
      error: "Il titolo dell'evento non può superare i 500 caratteri",
      event: {
        id: "",
        title: "x".repeat(501),
        startTime,
      },
    });
    await expect(
      createCalendarEvent({
        title: "Riunione",
        startTime,
        endTime: new Date("2026-03-15T08:00:00.000Z"),
      }),
    ).resolves.toEqual({
      success: false,
      error: "La data di fine deve essere successiva alla data di inizio",
      event: {
        id: "",
        title: "Riunione",
        startTime,
      },
    });
    await expect(createCalendarEvent({ title: "Riunione", startTime })).resolves.toEqual({
      success: true,
      event: {
        id: "event-1",
        title: "Riunione",
        startTime: new Date("2026-03-15T09:00:00.000Z"),
      },
    });
    await expect(createCalendarEvent({ title: "Riunione", startTime })).resolves.toEqual({
      success: false,
      error: "save failed",
      event: {
        id: "",
        title: "Riunione",
        startTime,
      },
    });

    expect(createEvent).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalled();
  });
});
