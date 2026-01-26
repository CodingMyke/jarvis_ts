import type { SystemToolDefinition } from "../types";

export const DELETE_CALENDAR_EVENT_TOOL_NAME = "deleteCalendarEvent";

/**
 * Tool per eliminare un evento dal calendario.
 * L'assistente può usarlo quando l'utente chiede di cancellare, eliminare o rimuovere
 * un appuntamento, un evento o un impegno dal calendario.
 */
export const deleteCalendarEventTool: SystemToolDefinition = {
  name: DELETE_CALENDAR_EVENT_TOOL_NAME,

  description:
    "Elimina un evento dal calendario dell'utente. " +
    "Usa questo tool quando l'utente chiede di cancellare, eliminare, rimuovere " +
    "o annullare un appuntamento, un evento o un impegno. " +
    "Esempi: 'cancella la riunione di domani', " +
    "'elimina l'appuntamento con il dentista', " +
    "'rimuovi l'evento X dal calendario', " +
    "'annulla la riunione di lunedì'. " +
    "È necessario fornire l'ID dell'evento o informazioni sufficienti per identificarlo univocamente.",

  parameters: {
    type: "object",
    properties: {
      eventId: {
        type: "string",
        description:
          "ID dell'evento da eliminare (obbligatorio). Puoi ottenere l'ID chiamando prima getCalendarEvents.",
      },
    },
    required: ["eventId"],
  },

  execute: async (args) => {
    try {
      const eventId = args.eventId as string | undefined;

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

      // Chiama l'API route lato server che ha accesso alle variabili d'ambiente
      const response = await fetch(`/api/calendar/events?eventId=${encodeURIComponent(eventId.trim())}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          result: {
            success: false,
            error: errorData.error || "DELETE_FAILED",
            errorMessage: errorData.errorMessage || `Errore HTTP: ${response.status}`,
          },
        };
      }

      const data = await response.json();

      if (!data.success) {
        return {
          result: {
            success: false,
            error: data.error || "DELETE_FAILED",
            errorMessage: data.errorMessage || "Errore durante l'eliminazione dell'evento",
          },
        };
      }

      return {
        result: {
          success: true,
          message: "Evento eliminato con successo dal calendario",
        },
      };
    } catch (error) {
      console.error("[deleteCalendarEventTool] Errore:", error);
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
