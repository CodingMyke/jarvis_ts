// used the fkg testing skill zioo

import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateCalendarEventTool } from "./update-calendar-event.tool";

describe("updateCalendarEventTool", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T09:30:00.000Z"));
    vi.stubGlobal("fetch", vi.fn());
  });

  it("validates required fields, titles and date ranges", async () => {
    await expect(
      updateCalendarEventTool.execute({}, {} as never),
    ).resolves.toEqual({
      result: {
        success: false,
        error: "MISSING_EVENT_ID",
        errorMessage: "L'ID dell'evento è obbligatorio",
      },
    });

    await expect(
      updateCalendarEventTool.execute({
        eventId: "evt-1",
        title: "   ",
      }, {} as never),
    ).resolves.toEqual({
      result: {
        success: false,
        error: "EMPTY_TITLE",
        errorMessage: "Il titolo dell'evento non può essere vuoto",
      },
    });

    await expect(
      updateCalendarEventTool.execute({
        eventId: "evt-1",
        title: "x".repeat(501),
      }, {} as never),
    ).resolves.toEqual({
      result: {
        success: false,
        error: "TITLE_TOO_LONG",
        errorMessage: "Il titolo dell'evento non può superare i 500 caratteri",
      },
    });

    await expect(
      updateCalendarEventTool.execute({
        eventId: "evt-1",
        startDateTime: "2026-03-15 15:00",
        endDateTime: "2026-03-15 14:00",
      }, {} as never),
    ).resolves.toEqual({
      result: {
        success: false,
        error: "INVALID_DATES",
        errorMessage: "La data di fine deve essere successiva alla data di inizio",
      },
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("capitalizes and normalizes the update payload on success", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        event: {
          id: "evt-1",
          title: "Riunione team",
          startTime: "2026-03-15T13:00:00.000Z",
          endTime: "2026-03-15T14:00:00.000Z",
          description: "Allineamento sprint",
          location: "Sala Alpha",
          attendees: ["team@example.com"],
        },
      }),
    } as Response);

    const result = await updateCalendarEventTool.execute({
      eventId: " evt-1 ",
      title: " riunione team ",
      startDateTime: "15/03/2026 14:00",
      endDateTime: "15/03/2026 15:00",
      description: " Allineamento sprint ",
      location: " Sala Alpha ",
      attendees: ["team@example.com"],
      isAllDay: false,
    }, {} as never);

    expect(fetch).toHaveBeenCalledWith(
      "/api/calendar/events",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          eventId: "evt-1",
          title: "Riunione team",
          startTime: "2026-03-15T13:00:00.000Z",
          endTime: "2026-03-15T14:00:00.000Z",
          description: "Allineamento sprint",
          location: "Sala Alpha",
          attendees: ["team@example.com"],
          isAllDay: false,
        }),
      }),
    );

    expect(result).toMatchObject({
      result: {
        success: true,
        event: {
          id: "evt-1",
          title: "Riunione team",
        },
      },
    });
    expect(result).toMatchObject({
      result: {
        message: expect.stringContaining('Ho aggiornato l\'evento "Riunione team"'),
      },
    });
    expect(result).toMatchObject({
      result: {
        message: expect.stringContaining("presso Sala Alpha"),
      },
    });
  });

  it("parses ISO inputs, partial ISO strings and time-only updates", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        event: {
          id: "evt-1",
          title: "Aggiornato",
          startTime: "2026-03-15T10:15:00.000Z",
          endTime: "2026-03-15T11:15:00.000Z",
        },
      }),
    } as Response);

    await updateCalendarEventTool.execute({
      eventId: "evt-1",
      startDateTime: "2026-03-15T10:15:00.000Z",
    }, {} as never);

    await updateCalendarEventTool.execute({
      eventId: "evt-1",
      startDateTime: "2026-03-16 10:30 extra",
      endDateTime: "18:45",
    }, {} as never);

    await updateCalendarEventTool.execute({
      eventId: "evt-1",
      startDateTime: "quando puoi",
    }, {} as never);

    expect(
      JSON.parse(vi.mocked(fetch).mock.calls[0]?.[1]?.body as string),
    ).toMatchObject({
      eventId: "evt-1",
      startTime: "2026-03-15T10:15:00.000Z",
    });

    expect(
      JSON.parse(vi.mocked(fetch).mock.calls[1]?.[1]?.body as string),
    ).toMatchObject({
      eventId: "evt-1",
      startTime: "2026-03-16T09:30:00.000Z",
      endTime: "2026-03-16T17:45:00.000Z",
    });

    expect(
      JSON.parse(vi.mocked(fetch).mock.calls[2]?.[1]?.body as string),
    ).toMatchObject({
      eventId: "evt-1",
      startTime: "2026-03-15T09:30:00.000Z",
    });
  });

  it("maps API failures, unsuccessful payloads and thrown errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        error: "UPDATE_FAILED",
        errorMessage: "Aggiornamento fallito",
      }),
    } as Response);

    await expect(
      updateCalendarEventTool.execute({ eventId: "evt-1" }, {} as never),
    ).resolves.toEqual({
      result: {
        success: false,
        error: "UPDATE_FAILED",
        errorMessage: "Aggiornamento fallito",
      },
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        error: "UPDATE_FAILED",
        errorMessage: "Calendario non raggiungibile",
      }),
    } as Response);

    await expect(
      updateCalendarEventTool.execute({ eventId: "evt-1" }, {} as never),
    ).resolves.toEqual({
      result: {
        success: false,
        error: "UPDATE_FAILED",
        errorMessage: "Calendario non raggiungibile",
      },
    });

    vi.mocked(fetch).mockRejectedValueOnce(new Error("timeout"));

    await expect(
      updateCalendarEventTool.execute({ eventId: "evt-1" }, {} as never),
    ).resolves.toEqual({
      result: {
        success: false,
        error: "EXECUTION_ERROR",
        errorMessage: "timeout",
      },
    });
  });
});
