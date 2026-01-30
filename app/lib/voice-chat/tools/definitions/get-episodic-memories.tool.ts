import type { SystemToolDefinition } from "../types";

export const GET_EPISODIC_MEMORIES_TOOL_NAME = "getEpisodicMemories";

/**
 * Tool per leggere le memorie episodiche dell'utente.
 * Chiama l'API /api/memory/episodic (GET). Richiede autenticazione Supabase.
 */
export const getEpisodicMemoriesTool: SystemToolDefinition = {
  name: GET_EPISODIC_MEMORIES_TOOL_NAME,

  description:
    "Legge le memorie episodiche dell'utente (eventi, episodi, esperienze memorizzate). " +
    "Usa questo tool quando l'utente chiede quali episodi o eventi hai salvato, " +
    "di elencare le memorie episodiche o di ricordare qualcosa che è successo. " +
    "Senza parametri restituisce tutte le memorie; con 'id' restituisce una singola memoria. " +
    "Esempi: 'quali episodi hai salvato?', 'mostrami le memorie episodiche', 'cosa ricordi che è successo?'.",

  parameters: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description:
          "ID opzionale di una singola memoria da leggere. " +
          "Se omesso, restituisce l'elenco di tutte le memorie episodiche dell'utente.",
      },
    },
  },

  execute: async (args) => {
    try {
      const id = args.id as string | undefined;
      const url = id?.trim()
        ? `/api/memory/episodic?id=${encodeURIComponent(id.trim())}`
        : "/api/memory/episodic";
      const response = await fetch(url, { credentials: "include" });
      const data = await response.json();

      if (response.status === 401) {
        return {
          result: {
            success: false,
            error: "UNAUTHORIZED",
            errorMessage: "Utente non autenticato. Effettua il login per accedere alle memorie.",
          },
        };
      }

      if (!response.ok) {
        return {
          result: {
            success: false,
            error: data.error || "EXECUTION_ERROR",
            errorMessage: data.message || data.errorMessage || "Errore nel leggere le memorie episodiche.",
          },
        };
      }

      if (!data.success) {
        return {
          result: {
            success: false,
            error: data.error || "UNKNOWN_ERROR",
            errorMessage: data.message || data.errorMessage || "Errore nel leggere le memorie.",
          },
        };
      }

      if (data.memory) {
        return {
          result: {
            success: true,
            memory: data.memory,
          },
        };
      }

      return {
        result: {
          success: true,
          memories: data.memories ?? [],
          count: data.count ?? 0,
        },
      };
    } catch (error) {
      console.error("[getEpisodicMemoriesTool] Errore:", error);
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
