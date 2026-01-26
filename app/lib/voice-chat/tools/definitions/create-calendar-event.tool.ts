import type { SystemToolDefinition } from "../types";
import { createCalendarEvent } from "@/app/lib/calendar/actions";

export const CREATE_CALENDAR_EVENT_TOOL_NAME = "createCalendarEvent";

/**
 * Converte una stringa di data/ora in un oggetto Date.
 * Supporta vari formati comuni.
 */
function parseDateTime(dateTimeStr: string, referenceDate?: Date): Date {
  const ref = referenceDate || new Date();
  
  // Se è già un timestamp ISO, usalo direttamente
  if (dateTimeStr.includes("T") || dateTimeStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    const parsed = new Date(dateTimeStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // Prova a parsare come data italiana (DD/MM/YYYY HH:mm)
  const italianFormat = dateTimeStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (italianFormat) {
    const [, day, month, year, hour = "0", minute = "0"] = italianFormat;
    const date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute)
    );
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Prova a parsare come data ISO (YYYY-MM-DD HH:mm)
  const isoFormat = dateTimeStr.match(/(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (isoFormat) {
    const [, year, month, day, hour = "0", minute = "0"] = isoFormat;
    const date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute)
    );
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Fallback: usa la data di riferimento e aggiungi l'ora se specificata
  const timeMatch = dateTimeStr.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const [, hour, minute] = timeMatch;
    const date = new Date(ref);
    date.setHours(parseInt(hour), parseInt(minute), 0, 0);
    return date;
  }

  // Ultimo fallback: usa la data di riferimento
  return ref;
}

/**
 * Tool per creare un nuovo evento nel calendario.
 * L'assistente può usarlo quando l'utente chiede di aggiungere un appuntamento,
 * un evento, un impegno o un promemoria nel calendario.
 */
export const createCalendarEventTool: SystemToolDefinition = {
  name: CREATE_CALENDAR_EVENT_TOOL_NAME,

  description:
    "Crea un nuovo evento nel calendario dell'utente. " +
    "Usa questo tool quando l'utente chiede di aggiungere un appuntamento, " +
    "un evento, un impegno, un promemoria o qualsiasi cosa nel calendario. " +
    "Esempi: 'aggiungi un appuntamento domani alle 15', " +
    "'crea un evento per la riunione di lunedì alle 10', " +
    "'segna in calendario che ho il dentista il 15 marzo alle 14:30', " +
    "'ricordami di chiamare Mario domani alle 9'. " +
    "Se l'utente non specifica la data, usa oggi. Se non specifica l'ora, usa l'ora corrente o un'ora ragionevole.",

  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description:
          "Titolo dell'evento (obbligatorio). Esempi: 'Riunione con il team', 'Appuntamento dal dentista', 'Chiamare Mario'.",
      },
      startDateTime: {
        type: "string",
        description:
          "Data e ora di inizio dell'evento in formato ISO 8601 (YYYY-MM-DDTHH:mm:ss) o formato italiano (DD/MM/YYYY HH:mm). " +
          "Se non specificato, usa la data e ora corrente. " +
          "Esempi: '2024-03-15T14:30:00', '15/03/2024 14:30', '2024-03-15 14:30'.",
      },
      endDateTime: {
        type: "string",
        description:
          "Data e ora di fine dell'evento in formato ISO 8601 o formato italiano. " +
          "Se non specificato, l'evento dura 1 ora dall'inizio. " +
          "Esempi: '2024-03-15T16:00:00', '15/03/2024 16:00'.",
      },
      description: {
        type: "string",
        description:
          "Descrizione dettagliata dell'evento. Opzionale. " +
          "Esempi: 'Discussione del nuovo progetto', 'Portare i documenti'.",
      },
      location: {
        type: "string",
        description:
          "Luogo dell'evento. Opzionale. " +
          "Esempi: 'Ufficio principale', 'Ristorante Da Luigi, Via Roma 42', 'Zoom Meeting'.",
      },
      attendees: {
        type: "array",
        items: {
          type: "string",
        },
        description:
          "Lista di partecipanti all'evento (nomi o email). Opzionale. " +
          "Esempi: ['Marco Rossi', 'giulia@example.com'].",
      },
      isAllDay: {
        type: "boolean",
        description:
          "Se true, l'evento dura tutto il giorno. Default: false. " +
          "Usa true per eventi come compleanni, festività, ecc.",
      },
    },
    required: ["title"],
  },

  execute: async (args) => {
    try {
      const title = args.title as string | undefined;
      const startDateTimeStr = args.startDateTime as string | undefined;
      const endDateTimeStr = args.endDateTime as string | undefined;
      const description = args.description as string | undefined;
      const location = args.location as string | undefined;
      const attendees = args.attendees as string[] | undefined;
      const isAllDay = args.isAllDay as boolean | undefined;

      // Validazione titolo
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return {
          result: {
            success: false,
            error: "MISSING_TITLE",
            errorMessage: "Il titolo dell'evento è obbligatorio",
          },
        };
      }

      if (title.trim().length > 500) {
        return {
          result: {
            success: false,
            error: "TITLE_TOO_LONG",
            errorMessage: "Il titolo dell'evento non può superare i 500 caratteri",
          },
        };
      }

      // Parsing date
      const now = new Date();
      const startTime = startDateTimeStr
        ? parseDateTime(startDateTimeStr, now)
        : now;

      let endTime: Date | undefined;
      if (endDateTimeStr) {
        endTime = parseDateTime(endDateTimeStr, startTime);
      } else if (!isAllDay) {
        // Default: 1 ora dopo l'inizio se non è tutto il giorno
        endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + 1);
      }

      // Validazione date
      if (endTime && endTime < startTime) {
        return {
          result: {
            success: false,
            error: "INVALID_DATES",
            errorMessage: "La data di fine deve essere successiva alla data di inizio",
          },
        };
      }

      // Chiama la server action riutilizzabile
      const result = await createCalendarEvent({
        title: title.trim(),
        startTime,
        endTime,
        description: description?.trim(),
        location: location?.trim(),
        attendees,
        isAllDay: isAllDay || false,
      });

      if (!result.success) {
        return {
          result: {
            success: false,
            error: "CREATION_FAILED",
            errorMessage: result.error || "Errore durante la creazione dell'evento",
          },
        };
      }

      // Formatta la risposta per l'assistente
      const event = result.event;
      const startFormatted = event.startTime.toLocaleString("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      });

      let message = `Ho creato l'evento "${event.title}" per ${startFormatted}`;
      if (event.endTime) {
        const endFormatted = event.endTime.toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
        });
        message += ` fino alle ${endFormatted}`;
      }
      if (event.location) {
        message += ` presso ${event.location}`;
      }

      return {
        result: {
          success: true,
          message,
          event: {
            id: event.id,
            title: event.title,
            startTime: event.startTime.toISOString(),
            endTime: event.endTime?.toISOString(),
            description: event.description,
            location: event.location,
            attendees: event.attendees,
          },
        },
      };
    } catch (error) {
      console.error("[createCalendarEventTool] Errore:", error);
      return {
        result: {
          success: false,
          error: "EXECUTION_ERROR",
          errorMessage: error instanceof Error ? error.message : "Errore sconosciuto",
        },
      };
    }
  },
};
