import { deleteCalendarEvent } from "@/app/_features/calendar/lib/calendar-client";
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
      const eventId = args.eventId as string | undefined;

      if (!eventId || typeof eventId !== "string" || eventId.trim().length === 0) {
        return {
          result: {
            success: false,
            error: "MISSING_EVENT_ID",
            errorMessage: "L'ID dell'evento è obbligatorio",
          },
        };
      }
      const result = await deleteCalendarEvent({ eventId: eventId.trim() });

      return {
        result: result.success
          ? {
              success: true,
              message: result.message ?? "Evento eliminato con successo dal calendario",
            }
          : result,
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
