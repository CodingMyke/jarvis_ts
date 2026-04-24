// used the fkg testing skill zioo

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCalendarEventTool } from "./create-calendar-event.tool";

describe("createCalendarEventTool", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T09:30:00.000Z"));
    vi.stubGlobal("fetch", vi.fn());
  });

  it("validates the title and date range before calling the API", async () => {
    await expect(
      createCalendarEventTool.execute({ title: "   " }, {} as never),
    ).resolves.toEqual({
      result: {
        success: false,
        error: "MISSING_TITLE",
        errorMessage: "Il titolo dell'evento è obbligatorio",
      },
    });

    await expect(
      createCalendarEventTool.execute({ title: "x".repeat(501) }, {} as never),
    ).resolves.toEqual({
      result: {
        success: false,
        error: "TITLE_TOO_LONG",
        errorMessage: "Il titolo dell'evento non può superare i 500 caratteri",
      },
    });

    await expect(
      createCalendarEventTool.execute({
        title: "Riunione",
        startDateTime: "15/03/2026 10:00",
        endDateTime: "15/03/2026 09:00",
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

  it("capitalizes and normalizes the payload, defaulting the end time to one hour later", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        event: {
          id: "evt-1",
          title: "Dentista",
          startTime: "2026-03-15T09:30:00.000Z",
          endTime: "2026-03-15T10:30:00.000Z",
          description: "Portare documenti",
          location: "Studio Rossi",
          attendees: ["mario@example.com"],
        },
      }),
    } as Response);

    const result = await createCalendarEventTool.execute({
      title: " dentista ",
      startDateTime: "15/03/2026 10:30",
      description: " Portare documenti ",
      location: " Studio Rossi ",
      attendees: ["mario@example.com"],
    }, {} as never);

    expect(fetch).toHaveBeenCalledWith(
      "/api/calendar/events",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          title: "Dentista",
          startTime: "2026-03-15T09:30:00.000Z",
          endTime: "2026-03-15T10:30:00.000Z",
          description: "Portare documenti",
          location: "Studio Rossi",
          attendees: ["mario@example.com"],
          isAllDay: false,
        }),
      }),
    );

    expect(result).toMatchObject({
      result: {
        success: true,
        event: {
          id: "evt-1",
          title: "Dentista",
          location: "Studio Rossi",
        },
      },
    });
    expect(result).toMatchObject({
      result: {
        message: expect.stringContaining('Ho creato l\'evento "Dentista"'),
      },
    });
    expect(result).toMatchObject({
      result: {
        message: expect.stringContaining("presso Studio Rossi"),
      },
    });
  });

  it("parses ISO strings, time-only inputs and invalid fallbacks before calling the API", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        event: {
          id: "evt-iso",
          title: "Planning",
          startTime: "2026-03-15T10:15:00.000Z",
          endTime: "2026-03-15T11:15:00.000Z",
        },
      }),
    } as Response);

    await createCalendarEventTool.execute({
      title: "planning",
      startDateTime: "2026-03-15T10:15:00.000Z",
      isAllDay: true,
    }, {} as never);

    await createCalendarEventTool.execute({
      title: "review",
      startDateTime: "2026-03-16 10:30 extra",
      endDateTime: "18:45",
    }, {} as never);

    await createCalendarEventTool.execute({
      title: "fallback",
      startDateTime: "quando puoi",
    }, {} as never);

    expect(
      JSON.parse(vi.mocked(fetch).mock.calls[0]?.[1]?.body as string),
    ).toMatchObject({
      title: "Planning",
      startTime: "2026-03-15T10:15:00.000Z",
      isAllDay: true,
    });

    expect(
      JSON.parse(vi.mocked(fetch).mock.calls[1]?.[1]?.body as string),
    ).toMatchObject({
      title: "Review",
      startTime: "2026-03-16T09:30:00.000Z",
      endTime: "2026-03-16T17:45:00.000Z",
      isAllDay: false,
    });

    expect(
      JSON.parse(vi.mocked(fetch).mock.calls[2]?.[1]?.body as string),
    ).toMatchObject({
      title: "Fallback",
      startTime: "2026-03-15T09:30:00.000Z",
      endTime: "2026-03-15T10:30:00.000Z",
      isAllDay: false,
    });
  });

  it("handles API failures, unsuccessful payloads and thrown execution errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({
        error: "UNAVAILABLE",
        errorMessage: "Calendario non disponibile",
      }),
    } as Response);

    await expect(
      createCalendarEventTool.execute({ title: "Checkup" }, {} as never),
    ).resolves.toEqual({
      result: {
        success: false,
        error: "UNAVAILABLE",
        errorMessage: "Calendario non disponibile",
      },
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        error: "CREATION_FAILED",
        errorMessage: "Creazione fallita",
      }),
    } as Response);

    await expect(
      createCalendarEventTool.execute({ title: "Checkup" }, {} as never),
    ).resolves.toEqual({
      result: {
        success: false,
        error: "CREATION_FAILED",
        errorMessage: "Creazione fallita",
      },
    });

    vi.mocked(fetch).mockRejectedValueOnce(new Error("network down"));

    await expect(
      createCalendarEventTool.execute({ title: "Checkup" }, {} as never),
    ).resolves.toEqual({
      result: {
        success: false,
        error: "EXECUTION_ERROR",
        errorMessage: "network down",
      },
    });
  });
});
