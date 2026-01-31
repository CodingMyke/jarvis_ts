import type { SystemToolDefinition } from "../types";

export const SEARCH_CHATS_TOOL_NAME = "searchChats";

/**
 * Tool per cercare chat per similarità semantica (switch in linguaggio naturale).
 * Chiama GET /api/chats?search=query. Restituisce match con chat_id, title, summary_text.
 */
export const searchChatsTool: SystemToolDefinition = {
  name: SEARCH_CHATS_TOOL_NAME,

  description:
    "Cerca tra le chat dell'utente per argomento o contesto (es. 'la chat in cui parlavamo di ricette', 'conversazione sul viaggio'). Usa solo per trovare una chat da aprire; non per keyword. Restituisce una o più chat ordinate per rilevanza. Se un solo match chiaro, l'assistente può proporre di passare a quella chat; se multipli, elenca le opzioni e chiede conferma.",

  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Descrizione in linguaggio naturale dell'argomento o contesto della chat da trovare.",
      },
      limit: {
        type: "number",
        description:
          "Numero massimo di chat da restituire (opzionale, default 5, max 20).",
      },
    },
    required: ["query"],
  },

  execute: async (args) => {
    try {
      const query = (args.query as string)?.trim() ?? "";
      const limit = typeof args.limit === "number" && args.limit > 0 ? Math.min(args.limit, 20) : 5;
      if (!query) {
        return {
          result: {
            success: false,
            error: "MISSING_QUERY",
            errorMessage: "Il parametro query è obbligatorio.",
          },
        };
      }

      const url = `/api/chats?search=${encodeURIComponent(query)}&limit=${limit}`;
      const response = await fetch(url, { credentials: "include" });
      const data = (await response.json()) as {
        success?: boolean;
        matches?: { chat_id: string; title: string; summary_text: string; similarity: number }[];
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
            errorMessage: data.message ?? data.error ?? "Errore nella ricerca chat.",
          },
        };
      }

      if (!data.success) {
        return {
          result: {
            success: false,
            error: data.error ?? "UNKNOWN_ERROR",
            errorMessage: data.message ?? data.error ?? "Errore nella ricerca chat.",
          },
        };
      }

      const matches = data.matches ?? [];
      return {
        result: {
          success: true,
          matches: matches.map((m) => ({
            chat_id: m.chat_id,
            title: m.title,
            summary_text: m.summary_text,
            similarity: m.similarity,
          })),
          count: data.count ?? matches.length,
        },
      };
    } catch (error) {
      console.error("[searchChatsTool]", error);
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
