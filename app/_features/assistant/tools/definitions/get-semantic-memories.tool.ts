import type { SystemToolDefinition } from "../types";

export const GET_SEMANTIC_MEMORIES_TOOL_NAME = "getSemanticMemories";

/**
 * Tool per leggere le memorie semantiche dell'utente.
 * Chiama l'API /api/memory/semantic (GET). Richiede autenticazione Supabase.
 */
export const getSemanticMemoriesTool: SystemToolDefinition = {
  name: GET_SEMANTIC_MEMORIES_TOOL_NAME,

  description:
    "Legge le memorie semantiche dell'utente (conoscenze, fatti, preferenze memorizzate). " +
    "Usa questo tool quando l'utente chiede cosa ricordi di lui, quali preferenze hai salvato, " +
    "o di elencare le memorie/conoscenze memorizzate. " +
    "Senza parametri restituisce tutte le memorie; con 'id' restituisce una singola memoria. " +
    "Esempi: 'cosa ricordi di me?', 'quali preferenze hai salvato?', 'mostrami le mie memorie semantiche'.",

  parameters: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description:
          "ID opzionale di una singola memoria da leggere. " +
          "Se omesso, restituisce l'elenco di tutte le memorie semantiche dell'utente.",
      },
    },
  },

  execute: async (args) => {
    try {
      const id = args.id as string | undefined;
      const url = id?.trim()
        ? `/api/memory/semantic?id=${encodeURIComponent(id.trim())}`
        : "/api/memory/semantic";
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
            errorMessage: data.message || data.errorMessage || "Errore nel leggere le memorie semantiche.",
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
      console.error("[getSemanticMemoriesTool] Errore:", error);
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
