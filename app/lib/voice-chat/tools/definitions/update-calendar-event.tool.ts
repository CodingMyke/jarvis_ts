import type { SystemToolDefinition } from "../types";

export const UPDATE_CALENDAR_EVENT_TOOL_NAME = "updateCalendarEvent";

/**
 * Capitalizza la prima lettera di una stringa.
 */
function capitalizeFirstLetter(str: string): string {
  if (str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

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
 * Tool per aggiornare un evento esistente nel calendario.
 * L'assistente può usarlo quando l'utente chiede di modificare un appuntamento,
 * un evento o un impegno esistente nel calendario.
 */
export const updateCalendarEventTool: SystemToolDefinition = {
  name: UPDATE_CALENDAR_EVENT_TOOL_NAME,

  description:
    "Aggiorna un evento esistente nel calendario dell'utente. " +
    "Usa questo tool quando l'utente chiede di modificare, spostare, cambiare " +
    "o aggiornare un appuntamento, un evento o un impegno esistente. " +
    "Esempi: 'sposta la riunione di domani alle 15', " +
    "'cambia il titolo dell'evento X in Y', " +
    "'modifica l'appuntamento con il dentista alle 16 invece delle 14', " +
    "'aggiorna la descrizione dell'evento X'. " +
    "È necessario fornire l'ID dell'evento o informazioni sufficienti per identificarlo univocamente.",

  parameters: {
    type: "object",
    properties: {
      eventId: {
        type: "string",
        description:
          "ID dell'evento da aggiornare (obbligatorio). Puoi ottenere l'ID chiamando prima getCalendarEvents.",
      },
      title: {
        type: "string",
        description:
          "Nuovo titolo dell'evento (opzionale). Esempi: 'Riunione con il team aggiornata', 'Appuntamento dal dentista'.",
      },
      startDateTime: {
        type: "string",
        description:
          "Nuova data e ora di inizio dell'evento in formato ISO 8601 (YYYY-MM-DDTHH:mm:ss) o formato italiano (DD/MM/YYYY HH:mm) (opzionale). " +
          "Esempi: '2024-03-15T14:30:00', '15/03/2024 14:30', '2024-03-15 14:30'.",
      },
      endDateTime: {
        type: "string",
        description:
          "Nuova data e ora di fine dell'evento in formato ISO 8601 o formato italiano (opzionale). " +
          "Esempi: '2024-03-15T16:00:00', '15/03/2024 16:00'.",
      },
      description: {
        type: "string",
        description:
          "Nuova descrizione dettagliata dell'evento (opzionale). " +
          "Esempi: 'Discussione del nuovo progetto aggiornata', 'Portare i documenti'.",
      },
      location: {
        type: "string",
        description:
          "Nuovo luogo dell'evento (opzionale). " +
          "Esempi: 'Ufficio principale', 'Ristorante Da Luigi, Via Roma 42', 'Zoom Meeting'.",
      },
      attendees: {
        type: "array",
        items: {
          type: "string",
        },
        description:
          "Nuova lista di partecipanti all'evento (nomi o email) (opzionale). " +
          "Esempi: ['Marco Rossi', 'giulia@example.com'].",
      },
      isAllDay: {
        type: "boolean",
        description:
          "Se true, l'evento dura tutto il giorno (opzionale). Default: mantiene il valore esistente. " +
          "Usa true per eventi come compleanni, festività, ecc.",
      },
    },
    required: ["eventId"],
  },

  execute: async (args) => {
    try {
      const eventId = args.eventId as string | undefined;
      const startDateTimeStr = args.startDateTime as string | undefined;
      const endDateTimeStr = args.endDateTime as string | undefined;
      const description = args.description as string | undefined;
      const location = args.location as string | undefined;
      const attendees = args.attendees as string[] | undefined;
      const isAllDay = args.isAllDay as boolean | undefined;

      // Validazione eventId
      if (!eventId || typeof eventId !== "string" || eventId.trim().length === 0) {
        return {
          result: {
            success: false,
            error: "MISSING_EVENT_ID",
            errorMessage: "L'ID dell'evento è obbligatorio",
          },
        };
      }

      // Validazione titolo se fornito
      if (args.title !== undefined) {
        const title = args.title as string;
        if (typeof title !== "string" || title.trim().length === 0) {
          return {
            result: {
              success: false,
              error: "EMPTY_TITLE",
              errorMessage: "Il titolo dell'evento non può essere vuoto",
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
      }

      // Capitalizza la prima lettera del titolo se fornito
      const capitalizedTitle = args.title
        ? capitalizeFirstLetter((args.title as string).trim())
        : undefined;

      // Parsing date
      let startTime: Date | undefined;
      if (startDateTimeStr) {
        startTime = parseDateTime(startDateTimeStr);
      }

      let endTime: Date | undefined;
      if (endDateTimeStr) {
        endTime = parseDateTime(endDateTimeStr, startTime);
      }

      // Validazione date
      if (startTime && endTime && endTime < startTime) {
        return {
          result: {
            success: false,
            error: "INVALID_DATES",
            errorMessage: "La data di fine deve essere successiva alla data di inizio",
          },
        };
      }

      // Chiama l'API route lato server che ha accesso alle variabili d'ambiente
      const response = await fetch("/api/calendar/events", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId: eventId.trim(),
          title: capitalizedTitle,
          startTime: startTime?.toISOString(),
          endTime: endTime?.toISOString(),
          description: description?.trim(),
          location: location?.trim(),
          attendees,
          isAllDay,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          result: {
            success: false,
            error: errorData.error || "UPDATE_FAILED",
            errorMessage: errorData.errorMessage || `Errore HTTP: ${response.status}`,
          },
        };
      }

      const data = await response.json();

      if (!data.success) {
        return {
          result: {
            success: false,
            error: data.error || "UPDATE_FAILED",
            errorMessage: data.errorMessage || "Errore durante l'aggiornamento dell'evento",
          },
        };
      }

      // Formatta la risposta per l'assistente
      const event = data.event;
      const eventStartTime = new Date(event.startTime);
      const eventEndTime = event.endTime ? new Date(event.endTime) : undefined;
      const startFormatted = eventStartTime.toLocaleString("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      });

      let message = `Ho aggiornato l'evento "${event.title}" per ${startFormatted}`;
      if (eventEndTime) {
        const endFormatted = eventEndTime.toLocaleTimeString("it-IT", {
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
            startTime: event.startTime,
            endTime: event.endTime,
            description: event.description,
            location: event.location,
            attendees: event.attendees,
          },
        },
      };
    } catch (error) {
      console.error("[updateCalendarEventTool] Errore:", error);
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
