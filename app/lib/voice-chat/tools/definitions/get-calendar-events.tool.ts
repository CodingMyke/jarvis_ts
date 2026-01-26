import type { SystemToolDefinition } from "../types";
import type { CalendarEvent } from "@/app/lib/calendar";

export const GET_CALENDAR_EVENTS_TOOL_NAME = "getCalendarEvents";

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
    "'ho appuntamenti questa settimana?', 'quando è la prossima riunione?'. " +
    "IMPORTANTE: Il tool ritorna un oggetto con: " +
    "- success: true/false " +
    "- events: array di eventi, dove ogni evento ha i campi: id (stringa, obbligatorio per delete/update), title, startTime, endTime, description, location, attendees, color, isAllDay " +
    "- eventCount: numero di eventi " +
    "- period: informazioni sul periodo richiesto " +
    "Per eliminare o aggiornare eventi, usa il campo 'id' di ogni evento nell'array 'events'. " +
    "NON includere mai l'ID nelle risposte all'utente. " +
    "FORMATO RISPOSTA OBBLIGATORIO: Quando elenchi gli eventi, usa SEMPRE questo formato per ogni evento: " +
    "'Dalle [ora inizio] a [ora fine]: [Titolo]'. " +
    "Formatta le ore in formato HH:mm (es. '14:30', '09:00'). " +
    "Se l'evento è tutto il giorno o non ha ora di fine, adatta il formato di conseguenza.",

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
    console.log("[getCalendarEventsTool] Executing with daysAhead:", daysAhead);

    try {
      // Chiama l'API route lato server che ha accesso alle variabili d'ambiente
      const response = await fetch(`/api/calendar/events?daysAhead=${daysAhead}`);
      console.log("[getCalendarEventsTool] Response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("[getCalendarEventsTool] Response data success:", data.success, "events count:", data.events?.length || 0);

      if (!data.success) {
        console.error("[getCalendarEventsTool] Failed to get events:", data.error, data.message);
        return {
          result: {
            success: false,
            error: data.error || "UNKNOWN_ERROR",
            errorMessage: data.message || "Errore nel leggere il calendario.",
          },
        };
      }

      // Converti le date da stringhe ISO a stringhe ISO (non oggetti Date)
      // perché quando viene serializzato con JSON.stringify, gli oggetti Date diventano stringhe
      // ma è meglio essere espliciti e usare stringhe ISO direttamente
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const events: CalendarEvent[] = (data.events || []).map((event: any) => ({
        id: event.id,
        title: event.title,
        startTime: new Date(event.startTime),
        endTime: event.endTime ? new Date(event.endTime) : undefined,
        description: event.description,
        location: event.location,
        attendees: event.attendees,
        color: event.color,
        isAllDay: event.isAllDay,
      }));

      // Serializza manualmente le date per evitare problemi con JSON.stringify
      const serializedEvents = events.map(event => ({
        id: event.id,
        title: event.title,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime?.toISOString(),
        description: event.description,
        location: event.location,
        attendees: event.attendees,
        color: event.color,
        isAllDay: event.isAllDay,
      }));

      console.log("[getCalendarEventsTool] Returning", serializedEvents.length, "events with IDs:", serializedEvents.map(e => e.id));

      return {
        result: {
          success: true,
          events: serializedEvents,
          eventCount: serializedEvents.length,
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
          error: "EXECUTION_ERROR",
          errorMessage: `Si è verificato un errore nel leggere il calendario: ${errorMessage}. Verifica la configurazione di Google Calendar.`,
        },
      };
    }
  },
};
