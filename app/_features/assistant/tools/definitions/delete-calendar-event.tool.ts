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
    "'annulla la riunione di lunedì', " +
    "'elimina tutti gli eventi di oggi'. " +
    "IMPORTANTE: Per eliminare eventi, devi prima chiamare getCalendarEvents per ottenere la lista degli eventi " +
    "con i loro ID. Poi, per ogni evento che vuoi eliminare, chiama questo tool con l'ID dell'evento. " +
    "Se l'utente chiede di eliminare più eventi (es. 'tutti gli eventi di oggi'), " +
    "chiama questo tool una volta per ogni evento usando il campo 'id' di ogni evento ottenuto da getCalendarEvents. " +
    "Il campo 'id' è sempre presente nella risposta di getCalendarEvents.",

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
      console.log("[deleteCalendarEventTool] Executing with args:", args);
      const eventId = args.eventId as string | undefined;

      // Validazione eventId
      if (!eventId || typeof eventId !== "string" || eventId.trim().length === 0) {
        console.error("[deleteCalendarEventTool] Missing or invalid eventId");
        return {
          result: {
            success: false,
            error: "MISSING_EVENT_ID",
            errorMessage: "L'ID dell'evento è obbligatorio",
          },
        };
      }

      const url = `/api/calendar/events?eventId=${encodeURIComponent(eventId.trim())}`;
      console.log("[deleteCalendarEventTool] Calling DELETE:", url);
      
      // Chiama l'API route lato server che ha accesso alle variabili d'ambiente
      const response = await fetch(url, {
        method: "DELETE",
      });
      
      console.log("[deleteCalendarEventTool] Response status:", response.status);

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
      console.log("[deleteCalendarEventTool] Response data:", data);

      if (!data.success) {
        console.error("[deleteCalendarEventTool] Delete failed:", data.error, data.errorMessage);
        return {
          result: {
            success: false,
            error: data.error || "DELETE_FAILED",
            errorMessage: data.errorMessage || "Errore durante l'eliminazione dell'evento",
          },
        };
      }

      console.log("[deleteCalendarEventTool] Event deleted successfully");
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
