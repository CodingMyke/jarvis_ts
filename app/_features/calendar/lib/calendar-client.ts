import type { DeleteCalendarEventUiResult, UIDayEvents } from "@/app/_features/calendar";
import { groupCalendarEventsByDay, type CalendarApiEvent } from "./calendar-mappers";

interface CalendarEventsApiResponse {
  success?: boolean;
  events?: CalendarApiEvent[];
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

export async function fetchCalendarEventsFromApi(options?: {
  from?: Date;
  to?: Date;
  daysAhead?: number;
}): Promise<UIDayEvents[]> {
  const params = new URLSearchParams();

  if (options?.daysAhead) {
    params.set("daysAhead", options.daysAhead.toString());
  } else if (options?.from && options?.to) {
    params.set("from", options.from.toISOString());
    params.set("to", options.to.toISOString());
  } else {
    params.set("daysAhead", "7");
  }

  const response = await fetch(`/api/calendar/events?${params.toString()}`);
  const data = (await response.json().catch(() => null)) as CalendarEventsApiResponse | null;

  if (!response.ok || !data?.success || !Array.isArray(data.events)) {
    throw new Error(getCalendarErrorMessage(data, `Errore HTTP ${response.status}`));
  }

  return groupCalendarEventsByDay(data.events);
}

export async function deleteCalendarEventFromApi(
  eventId: string,
): Promise<DeleteCalendarEventUiResult> {
  const trimmedEventId = eventId.trim();

  if (trimmedEventId.length === 0) {
    return {
      success: false,
      errorMessage: "ID evento non valido.",
    };
  }

  try {
    const response = await fetch(
      `/api/calendar/events?eventId=${encodeURIComponent(trimmedEventId)}`,
      {
        method: "DELETE",
      },
    );
    const data = (await response.json().catch(() => null)) as CalendarEventsApiResponse | null;

    if (!response.ok || !data?.success) {
      return {
        success: false,
        errorMessage: getCalendarErrorMessage(data, `Errore HTTP ${response.status}`),
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      errorMessage:
        error instanceof Error
          ? error.message
          : "Errore sconosciuto durante l'eliminazione dell'evento.",
    };
  }
}
