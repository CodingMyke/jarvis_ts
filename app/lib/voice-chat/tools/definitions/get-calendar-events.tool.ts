import type { SystemToolDefinition } from "../types";
import type { CalendarEvent } from "@/app/lib/calendar";

export const GET_CALENDAR_EVENTS_TOOL_NAME = "getCalendarEvents";

/**
 * Formatta una data in modo leggibile per l'assistente.
 */
function formatDateForAssistant(date: Date): string {
  return date.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formatta gli eventi per una risposta concisa all'assistente.
 */
function formatEventsForAssistant(events: CalendarEvent[]): string {
  if (events.length === 0) {
    return "Non ci sono eventi in calendario nel periodo richiesto.";
  }

  const eventLines = events.map((event) => {
    let line = `- ${formatDateForAssistant(event.startTime)}: ${event.title}`;
    if (event.location) {
      line += ` (luogo: ${event.location})`;
    }
    if (event.attendees && event.attendees.length > 0) {
      line += ` con ${event.attendees.join(", ")}`;
    }
    return line;
  });

  return `Hai ${events.length} evento/i:\n${eventLines.join("\n")}`;
}

/**
 * Tool per leggere gli eventi del calendario.
 * L'assistente può usarlo per rispondere a domande sugli impegni dell'utente.
 * 
 * NOTA: Questo tool chiama un'API route lato server perché i tool vengono eseguiti
 * lato client e non hanno accesso alle variabili d'ambiente del server.
 */
export const getCalendarEventsTool: SystemToolDefinition = {
  name: GET_CALENDAR_EVENTS_TOOL_NAME,

  description:
    "Legge gli eventi dal calendario dell'utente. " +
    "Usa questo tool quando l'utente chiede dei suoi impegni, appuntamenti, " +
    "eventi in agenda o cosa deve fare in un determinato giorno/periodo. " +
    "Esempi: 'cosa ho oggi?', 'quali sono i miei impegni di domani?', " +
    "'ho appuntamenti questa settimana?', 'quando è la prossima riunione?'",

  parameters: {
    type: "object",
    properties: {
      daysAhead: {
        type: "number",
        description:
          "Numero di giorni da oggi da considerare. Default: 7. " +
          "Usa 1 per 'oggi', 2 per 'oggi e domani', 7 per 'questa settimana'.",
      },
    },
    required: [],
  },

  execute: async (args) => {
    const daysAhead = (args.daysAhead as number) || 7;

    try {
      // Chiama l'API route lato server che ha accesso alle variabili d'ambiente
      const response = await fetch(`/api/calendar/events?daysAhead=${daysAhead}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        return {
          result: {
            success: false,
            message: data.message || "Errore nel leggere il calendario.",
            error: data.error || "UNKNOWN_ERROR",
          },
        };
      }

      // Converti le date da stringhe ISO a oggetti Date
      const events: CalendarEvent[] = (data.events || []).map((event: any) => ({
        ...event,
        startTime: new Date(event.startTime),
        endTime: event.endTime ? new Date(event.endTime) : undefined,
      }));

      const formattedResponse = formatEventsForAssistant(events);

      return {
        result: {
          success: true,
          message: formattedResponse,
          eventCount: events.length,
          period: data.period || {
            from: new Date().toISOString(),
            to: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString(),
            daysAhead,
          },
        },
      };
    } catch (error) {
      console.error("[getCalendarEventsTool] Errore:", error);
      const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
      
      return {
        result: {
          success: false,
          message: `Si è verificato un errore nel leggere il calendario: ${errorMessage}. Verifica la configurazione di Google Calendar.`,
          error: errorMessage,
        },
      };
    }
  },
};
