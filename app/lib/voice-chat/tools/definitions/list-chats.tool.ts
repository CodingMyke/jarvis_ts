import type { SystemToolDefinition } from "../types";

export const LIST_CHATS_TOOL_NAME = "listChats";

/**
 * Tool per ottenere l'elenco completo delle chat dell'utente dal database.
 * Chiama GET /api/chats (senza id né search). Restituisce id, title, summary_text, last_activity_at, created_at.
 */
export const listChatsTool: SystemToolDefinition = {
  name: LIST_CHATS_TOOL_NAME,

  description:
    "Ottieni l'elenco completo di tutte le chat dell'utente (ordine per ultima attività). Usa quando l'utente chiede 'quali chat ho', 'lista chat', 'tutte le mie conversazioni' o vuole una panoramica. Restituisce id, titolo, riassunto e date.",

  parameters: {
    type: "object",
    properties: {},
    required: [],
  },

  execute: async () => {
    try {
      const response = await fetch("/api/chats", { credentials: "include" });
      const data = (await response.json()) as {
        success?: boolean;
        chats?: {
          id: string;
          title: string | null;
          summary_text: string | null;
          last_activity_at: string;
          created_at: string;
        }[];
        count?: number;
        error?: string;
        message?: string;
      };

      if (response.status === 401) {
        return {
          result: {
            success: false,
            error: "UNAUTHORIZED",
            errorMessage: "Utente non autenticato. Effettua il login.",
          },
        };
      }

      if (!response.ok) {
        return {
          result: {
            success: false,
            error: data.error ?? "EXECUTION_ERROR",
            errorMessage: data.message ?? data.error ?? "Errore nel recupero della lista chat.",
          },
        };
      }

      if (!data.success) {
        return {
          result: {
            success: false,
            error: data.error ?? "UNKNOWN_ERROR",
            errorMessage: data.message ?? data.error ?? "Errore nel recupero della lista chat.",
          },
        };
      }

      const chats = (data.chats ?? []).map((c) => ({
        chat_id: c.id,
        title: c.title ?? "",
        summary_text: c.summary_text ?? "",
        last_activity_at: c.last_activity_at,
        created_at: c.created_at,
      }));

      return {
        result: {
          success: true,
          chats,
          count: data.count ?? chats.length,
        },
      };
    } catch (error) {
      console.error("[listChatsTool]", error);
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
