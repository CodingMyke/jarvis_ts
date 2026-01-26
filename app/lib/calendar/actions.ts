"use server";

import {
  getCalendarService,
  type CalendarEvent,
  type GetEventsOptions,
  type CreateEventOptions,
  type CreateEventResult,
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

/**
 * Server action per creare un nuovo evento nel calendario.
 * Funzione riutilizzabile che può essere chiamata da qualsiasi parte dell'applicazione.
 * 
 * @param options - Opzioni per creare l'evento
 * @returns Risultato della creazione con l'evento creato o errore
 */
export async function createCalendarEvent(
  options: CreateEventOptions
): Promise<CreateEventResult> {
  try {
    // Validazione base
    if (!options.title || options.title.trim().length === 0) {
      return {
        success: false,
        error: "Il titolo dell'evento è obbligatorio",
        event: {
          id: "",
          title: "",
          startTime: options.startTime,
        },
      };
    }

    if (options.title.trim().length > 500) {
      return {
        success: false,
        error: "Il titolo dell'evento non può superare i 500 caratteri",
        event: {
          id: "",
          title: options.title,
          startTime: options.startTime,
        },
      };
    }

    // Validazione date
    if (options.endTime && options.endTime < options.startTime) {
      return {
        success: false,
        error: "La data di fine deve essere successiva alla data di inizio",
        event: {
          id: "",
          title: options.title,
          startTime: options.startTime,
        },
      };
    }

    const service = getCalendarService();
    const result = await service.createEvent(options);

    return result;
  } catch (error) {
    console.error("[createCalendarEvent] Errore:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Errore sconosciuto durante la creazione dell'evento",
      event: {
        id: "",
        title: options.title,
        startTime: options.startTime,
      },
    };
  }
}
