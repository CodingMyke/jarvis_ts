"use server";

import {
  getCalendarService,
  type CalendarEvent,
  type GetEventsOptions,
} from "./index";

/**
 * Evento formattato per la UI.
 * Serializzabile per il passaggio server -> client.
 */
export interface UICalendarEvent {
  id: string;
  title: string;
  time: string;
  endTime?: string;
  color?: string;
  description?: string;
  location?: string;
  attendees?: string[];
}

/**
 * Giorno con i suoi eventi, formattato per la UI.
 */
export interface UIDayEvents {
  /** Data in formato ISO (solo giorno) */
  dateISO: string;
  events: UICalendarEvent[];
}

/**
 * Formatta l'orario da una Date.
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Converte un CalendarEvent nel formato UI.
 */
function toUIEvent(event: CalendarEvent): UICalendarEvent {
  return {
    id: event.id,
    title: event.title,
    time: formatTime(event.startTime),
    endTime: event.endTime ? formatTime(event.endTime) : undefined,
    color: event.color,
    description: event.description,
    location: event.location,
    attendees: event.attendees,
  };
}

/**
 * Raggruppa gli eventi per giorno.
 */
function groupEventsByDay(events: CalendarEvent[]): UIDayEvents[] {
  const grouped = new Map<string, UICalendarEvent[]>();

  for (const event of events) {
    const dateKey = event.startTime.toISOString().split("T")[0];
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(toUIEvent(event));
  }

  // Ordina per data e restituisci
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateISO, events]) => ({ dateISO, events }));
}

/**
 * Server action per ottenere gli eventi del calendario.
 * Chiamata in SSR per popolare la pagina iniziale.
 */
export async function fetchCalendarEvents(
  options?: GetEventsOptions
): Promise<UIDayEvents[]> {
  try {
    const service = getCalendarService();
    const { events } = await service.getEvents(options);
    return groupEventsByDay(events);
  } catch (error) {
    console.error("[fetchCalendarEvents] Errore:", error);
    return [];
  }
}
