import type { SystemToolDefinition } from "../types";

export const SEARCH_SEMANTIC_MEMORIES_TOOL_NAME = "searchSemanticMemories";

/**
 * Tool per cercare nelle memorie semantiche per similarità semantica.
 * Chiama POST /api/memory/semantic/search. Richiede autenticazione Supabase.
 */
export const searchSemanticMemoriesTool: SystemToolDefinition = {
  name: SEARCH_SEMANTIC_MEMORIES_TOOL_NAME,

  description:
    "Usa quando devi 'ricordare' fatti, preferenze o concetti relativi a un argomento (cercati per significato). " +
    "Parametri: query (testo/concept da cercare), match_count opzionale (default 5). " +
    "Non annunciare la ricerca a meno che non serva (es. domanda che richiede tempo); spesso rispondi direttamente senza dire che stai pensando o cercando.",

  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Testo o concetto da cercare nelle memorie semantiche. Restituisce le memorie più simili per significato.",
      },
      match_count: {
        type: "number",
        description:
          "Numero massimo di memorie da restituire (opzionale, default 5).",
      },
    },
    required: ["query"],
  },

  execute: async (args) => {
    try {
      const query = args.query as string;
      const matchCount = args.match_count as number | undefined;
      const body: { query: string; match_count?: number } = { query: query?.trim() ?? "" };
      if (typeof matchCount === "number" && matchCount > 0) body.match_count = matchCount;

      const response = await fetch("/api/memory/semantic/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
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
            errorMessage: data.message || data.errorMessage || "Errore nella ricerca semantica.",
          },
        };
      }

      if (!data.success) {
        return {
          result: {
            success: false,
            error: data.error || "UNKNOWN_ERROR",
            errorMessage: data.message || data.errorMessage || "Errore nella ricerca.",
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
      console.error("[searchSemanticMemoriesTool] Errore:", error);
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
