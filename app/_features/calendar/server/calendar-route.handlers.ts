import { getCalendarService } from "@/app/_features/calendar/server/calendar.service";
import type { CreateEventOptions, UpdateEventOptions } from "@/app/_features/calendar/types/types";
import { jsonError, jsonOk } from "@/app/_server/http/responses";
import { getZodErrorMessage } from "@/app/_server/http/zod";
import {
  calendarCreateBodySchema,
  calendarDeleteBodySchema,
  calendarGetQuerySchema,
  calendarUpdateBodySchema,
  resolveCalendarRange,
} from "./calendar-route.schemas";

function formatDateWithLocalTimezone(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  const offset = -date.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offset) / 60);
  const offsetMinutes = Math.abs(offset) % 60;
  const offsetSign = offset >= 0 ? "+" : "-";
  const offsetStr = `${offsetSign}${String(offsetHours).padStart(2, "0")}:${String(offsetMinutes).padStart(2, "0")}`;

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetStr}`;
}

function getConfiguredCalendarService() {
  const service = getCalendarService();

  if (!service.isConfigured()) {
    return {
      service: null,
      response: jsonError(503, {
        error: "CALENDAR_NOT_CONFIGURED",
        message: "Il calendario non è configurato.",
        errorMessage: "Configura Google Calendar prima di usare questa route.",
        events: [],
      }),
    };
  }

  return { service };
}

export async function handleGetCalendarEvents(searchParams: URLSearchParams) {
  const parsed = calendarGetQuerySchema.safeParse({
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    daysAhead: searchParams.get("daysAhead") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_QUERY",
      message: getZodErrorMessage(parsed.error),
      events: [],
    });
  }

  const configured = getConfiguredCalendarService();
  if (!configured.service) {
    return configured.response;
  }

  const { from, to } = resolveCalendarRange(parsed.data);
  const { events } = await configured.service.getEvents({ from, to });

  return jsonOk({
    success: true,
    events: events.map((event) => ({
      id: event.id,
      title: event.title,
      startTime: formatDateWithLocalTimezone(event.startTime),
      endTime: event.endTime ? formatDateWithLocalTimezone(event.endTime) : undefined,
      description: event.description,
      location: event.location,
      attendees: event.attendees,
      color: event.color,
      isAllDay: event.isAllDay,
    })),
    eventCount: events.length,
    period: {
      from: from.toISOString(),
      to: to.toISOString(),
    },
  });
}

export async function handleCreateCalendarEvent(body: unknown) {
  const parsed = calendarCreateBodySchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      errorMessage: getZodErrorMessage(parsed.error),
    });
  }

  const configured = getConfiguredCalendarService();
  if (!configured.service) {
    return configured.response;
  }

  const options: CreateEventOptions = {
    title: parsed.data.title,
    startTime: parsed.data.startTime ?? new Date(),
    endTime: parsed.data.endTime,
    description: parsed.data.description,
    location: parsed.data.location,
    attendees: parsed.data.attendees,
    color: parsed.data.color,
    isAllDay: parsed.data.isAllDay ?? false,
  };

  const result = await configured.service.createEvent(options);

  if (!result.success) {
    const isTokenExpired = result.error?.includes("REFRESH_TOKEN_EXPIRED");
    return jsonError(isTokenExpired ? 401 : 500, {
      error: isTokenExpired ? "REFRESH_TOKEN_EXPIRED" : "CREATION_FAILED",
      errorMessage: result.error || "Errore durante la creazione dell'evento",
    });
  }

  const { event } = result;
  return jsonOk({
    success: true,
    event: {
      id: event.id,
      title: event.title,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime?.toISOString(),
      description: event.description,
      location: event.location,
      attendees: event.attendees,
      color: event.color,
      isAllDay: event.isAllDay,
    },
  });
}

export async function handleUpdateCalendarEvent(body: unknown) {
  const parsed = calendarUpdateBodySchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      errorMessage: getZodErrorMessage(parsed.error),
    });
  }

  const configured = getConfiguredCalendarService();
  if (!configured.service) {
    return configured.response;
  }

  const options: UpdateEventOptions = {
    eventId: parsed.data.eventId,
    title: parsed.data.title,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
    description: parsed.data.description ?? undefined,
    location: parsed.data.location ?? undefined,
    attendees: parsed.data.attendees,
    color: parsed.data.color ?? undefined,
    isAllDay: parsed.data.isAllDay,
  };

  const result = await configured.service.updateEvent(options);

  if (!result.success) {
    const isTokenExpired = result.error?.includes("REFRESH_TOKEN_EXPIRED");
    return jsonError(isTokenExpired ? 401 : 500, {
      error: isTokenExpired ? "REFRESH_TOKEN_EXPIRED" : "UPDATE_FAILED",
      errorMessage: result.error || "Errore durante l'aggiornamento dell'evento",
    });
  }

  const { event } = result;
  return jsonOk({
    success: true,
    event: {
      id: event.id,
      title: event.title,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime?.toISOString(),
      description: event.description,
      location: event.location,
      attendees: event.attendees,
      color: event.color,
      isAllDay: event.isAllDay,
    },
  });
}

export async function handleDeleteCalendarEvent(searchParams: URLSearchParams) {
  const parsed = calendarDeleteBodySchema.safeParse({
    eventId: searchParams.get("eventId") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_QUERY",
      errorMessage: getZodErrorMessage(parsed.error),
    });
  }

  const configured = getConfiguredCalendarService();
  if (!configured.service) {
    return configured.response;
  }

  const result = await configured.service.deleteEvent(parsed.data.eventId);

  if (!result.success) {
    const isTokenExpired = result.error?.includes("REFRESH_TOKEN_EXPIRED");
    return jsonError(isTokenExpired ? 401 : 500, {
      error: isTokenExpired ? "REFRESH_TOKEN_EXPIRED" : "DELETE_FAILED",
      errorMessage: result.error || "Errore durante l'eliminazione dell'evento",
    });
  }

  return jsonOk({
    success: true,
    message: "Evento eliminato con successo",
  });
}
