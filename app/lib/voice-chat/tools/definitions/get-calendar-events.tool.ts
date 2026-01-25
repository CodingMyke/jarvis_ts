import type { SystemToolDefinition } from "../types";
import { getCalendarService, type CalendarEvent } from "@/app/lib/calendar";

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

    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + daysAhead);

    try {
      const service = getCalendarService();
      const { events } = await service.getEvents({ from, to });

      const formattedResponse = formatEventsForAssistant(events);

      return {
        result: {
          success: true,
          message: formattedResponse,
          eventCount: events.length,
          period: {
            from: from.toISOString(),
            to: to.toISOString(),
            daysAhead,
          },
        },
      };
    } catch (error) {
      console.error("[getCalendarEventsTool] Errore:", error);
      return {
        result: {
          success: false,
          message: "Si è verificato un errore nel leggere il calendario.",
          error: error instanceof Error ? error.message : "Errore sconosciuto",
        },
      };
    }
  },
};
