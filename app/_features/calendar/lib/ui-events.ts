import type { UIDayEvents } from "./actions";

export interface DeleteCalendarEventUiResult {
  success: boolean;
  errorMessage?: string;
}

export type DeleteCalendarEventHandler = (
  eventId: string,
) => Promise<DeleteCalendarEventUiResult>;

/**
 * Rimuove un evento dalla struttura UI raggruppata per giorno.
 * Restituisce sempre nuovi riferimenti immutabili.
 */
export function removeCalendarEventFromDays(
  days: UIDayEvents[],
  eventId: string,
): UIDayEvents[] {
  return days.flatMap((day) => {
    const nextEvents = day.events.filter((event) => event.id !== eventId);

    if (nextEvents.length === 0) {
      return [];
    }

    return [{ ...day, events: [...nextEvents] }];
  });
}
