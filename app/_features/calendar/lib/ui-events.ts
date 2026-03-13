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
  let hasRemovedEvent = false;

  const nextDays = days.flatMap((day) => {
    const nextEvents = day.events.filter((event) => event.id !== eventId);

    if (nextEvents.length !== day.events.length) {
      hasRemovedEvent = true;
    }

    if (nextEvents.length === 0) {
      return [];
    }

    return [{ ...day, events: [...nextEvents] }];
  });

  if (!hasRemovedEvent) {
    return nextDays;
  }

  return nextDays;
}
