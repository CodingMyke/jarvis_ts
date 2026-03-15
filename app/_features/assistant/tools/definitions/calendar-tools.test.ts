// used the fkg testing skill zioo
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteCalendarEvent,
  getCalendarEvents,
} from "@/app/_features/calendar/lib/calendar-client";
import { deleteCalendarEventTool } from "./delete-calendar-event.tool";
import { getCalendarEventsTool } from "./get-calendar-events.tool";

vi.mock("@/app/_features/calendar/lib/calendar-client", () => ({
  deleteCalendarEvent: vi.fn(),
  getCalendarEvents: vi.fn(),
}));

describe("calendar tools", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses raw events from the shared getCalendarEvents result", async () => {
    vi.mocked(getCalendarEvents).mockResolvedValue({
      success: true,
      events: [
        {
          id: "evt-1",
          title: "Standup",
          startTime: "2026-03-14T09:00:00+01:00",
          endTime: "2026-03-14T09:30:00+01:00",
        },
      ],
      days: [],
      eventCount: 1,
      period: {
        from: "2026-03-14T00:00:00.000Z",
        to: "2026-03-15T00:00:00.000Z",
        daysAhead: 1,
      },
    });

    const result = await getCalendarEventsTool.execute({ daysAhead: 1 }, {} as never);

    expect(getCalendarEvents).toHaveBeenCalledWith({ daysAhead: 1 });
    expect(result.result).toEqual({
      success: true,
      events: [
        {
          id: "evt-1",
          title: "Standup",
          startTime: "2026-03-14T09:00:00+01:00",
          endTime: "2026-03-14T09:30:00+01:00",
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

  it("maps deleteCalendarEvent success and error", async () => {
    vi.mocked(deleteCalendarEvent)
      .mockResolvedValueOnce({
        success: true,
        message: "Evento eliminato con successo",
      })
      .mockResolvedValueOnce({
        success: false,
        error: "DELETE_FAILED",
        errorMessage: "Errore delete",
        status: 500,
      });

    const successResult = await deleteCalendarEventTool.execute(
      { eventId: "evt-1" },
      {} as never,
    );
    const errorResult = await deleteCalendarEventTool.execute({ eventId: "evt-2" }, {} as never);

    expect(deleteCalendarEvent).toHaveBeenNthCalledWith(1, { eventId: "evt-1" });
    expect(successResult.result).toEqual({
      success: true,
      message: "Evento eliminato con successo",
    });
    expect(errorResult.result).toEqual({
      success: false,
      error: "DELETE_FAILED",
      errorMessage: "Errore delete",
      status: 500,
    });
  });
});
