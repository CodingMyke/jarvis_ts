import {
  calendarDeleteBodySchema,
  calendarGetQuerySchema,
  getCalendarSchemaErrorMessage,
} from "./calendar-operation.schemas";
import { groupCalendarEventsByDay, type CalendarApiEvent } from "./calendar-mappers";
import type { UIDayEvents } from "./calendar-ui.types";

export interface OperationError {
  success: false;
  error: string;
  errorMessage: string;
  status?: number;
}

export type GetCalendarEventsOperationResult =
  | {
      success: true;
      events: CalendarApiEvent[];
      days: UIDayEvents[];
      eventCount: number;
      period: {
        from: string;
        to: string;
        daysAhead?: number;
      };
    }
  | OperationError;

export type DeleteCalendarEventOperationResult =
  | {
      success: true;
      message?: string;
    }
  | OperationError;

interface CalendarEventsApiResponse {
  success?: boolean;
  events?: CalendarApiEvent[];
  eventCount?: number;
  period?: {
    from?: string;
    to?: string;
    daysAhead?: number;
  };
  message?: string;
  error?: string;
  errorMessage?: string;
}

function getCalendarErrorMessage(
  response: CalendarEventsApiResponse | null,
  fallback: string,
): string {
  return response?.errorMessage ?? response?.message ?? response?.error ?? fallback;
}

function toOperationError(
  response: CalendarEventsApiResponse | null,
  fallbackError: string,
  fallbackMessage: string,
  status?: number,
): OperationError {
  return {
    success: false,
    error: response?.error ?? fallbackError,
    errorMessage: getCalendarErrorMessage(response, fallbackMessage),
    status,
  };
}

function toUnexpectedOperationError(error: unknown, fallbackMessage: string): OperationError {
  return {
    success: false,
    error: "EXECUTION_ERROR",
    errorMessage: error instanceof Error ? error.message : fallbackMessage,
  };
}

function normalizeCalendarEvent(event: CalendarApiEvent): CalendarApiEvent {
  return {
    id: event.id,
    title: event.title,
    startTime: event.startTime,
    endTime: event.endTime,
    color: event.color,
    description: event.description,
    location: event.location,
    attendees: event.attendees,
    isAllDay: event.isAllDay,
  };
}

async function parseCalendarResponse(response: Response): Promise<CalendarEventsApiResponse | null> {
  return (await response.json().catch(() => null)) as CalendarEventsApiResponse | null;
}

export async function getCalendarEvents(input?: {
  from?: Date;
  to?: Date;
  daysAhead?: number;
}): Promise<GetCalendarEventsOperationResult> {
  const parsed = calendarGetQuerySchema.safeParse({
    from: input?.from?.toISOString(),
    to: input?.to?.toISOString(),
    daysAhead: input?.daysAhead,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "INVALID_QUERY",
      errorMessage: getCalendarSchemaErrorMessage(parsed.error, "Query non valida"),
      status: 400,
    };
  }

  const params = new URLSearchParams();

  if (parsed.data.daysAhead !== undefined) {
    params.set("daysAhead", String(parsed.data.daysAhead));
  } else if (parsed.data.from && parsed.data.to) {
    params.set("from", parsed.data.from);
    params.set("to", parsed.data.to);
  } else {
    params.set("daysAhead", "7");
  }

  try {
    const response = await fetch(`/api/calendar/events?${params.toString()}`);
    const data = await parseCalendarResponse(response);

    if (!response.ok || !data?.success || !Array.isArray(data.events)) {
      return toOperationError(
        data,
        "GET_CALENDAR_EVENTS_FAILED",
        `Errore HTTP ${response.status}`,
        response.status,
      );
    }

    const events = data.events.map(normalizeCalendarEvent);

    return {
      success: true,
      events,
      days: groupCalendarEventsByDay(events),
      eventCount: typeof data.eventCount === "number" ? data.eventCount : events.length,
      period: {
        from: data.period?.from ?? parsed.data.from ?? new Date().toISOString(),
        to:
          data.period?.to ??
          parsed.data.to ??
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        ...(data.period?.daysAhead !== undefined
          ? { daysAhead: data.period.daysAhead }
          : parsed.data.daysAhead !== undefined
            ? { daysAhead: parsed.data.daysAhead }
            : {}),
      },
    };
  } catch (error) {
    return toUnexpectedOperationError(
      error,
      "Errore sconosciuto durante il caricamento del calendario.",
    );
  }
}

export async function deleteCalendarEvent(input: {
  eventId: string;
}): Promise<DeleteCalendarEventOperationResult> {
  const parsed = calendarDeleteBodySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "INVALID_QUERY",
      errorMessage: getCalendarSchemaErrorMessage(parsed.error, "Query non valida"),
      status: 400,
    };
  }

  try {
    const response = await fetch(
      `/api/calendar/events?eventId=${encodeURIComponent(parsed.data.eventId)}`,
      {
        method: "DELETE",
      },
    );
    const data = await parseCalendarResponse(response);

    if (!response.ok || !data?.success) {
      return toOperationError(
        data,
        "DELETE_FAILED",
        `Errore HTTP ${response.status}`,
        response.status,
      );
    }

    return {
      success: true,
      message: data?.message,
    };
  } catch (error) {
    return toUnexpectedOperationError(
      error,
      "Errore sconosciuto durante l'eliminazione dell'evento.",
    );
  }
}
