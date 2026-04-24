import type { SystemToolDefinition } from "../types";

export const SEARCH_EPISODIC_MEMORIES_TOOL_NAME = "searchEpisodicMemories";

/**
 * Tool per cercare nelle memorie episodiche per similarità semantica.
 * Chiama POST /api/memory/episodic/search. Richiede autenticazione Supabase.
 */
export const searchEpisodicMemoriesTool: SystemToolDefinition = {
  name: SEARCH_EPISODIC_MEMORIES_TOOL_NAME,

  description:
    "Cerca nelle memorie EPISODICHE: eventi, conversazioni passate, decisioni prese, cose che sono successe, esperienze, appuntamenti menzionati, cose fatte o da fare (es. 'di cosa abbiamo parlato', 'quando ha detto che...', 'l'ultima volta che...'). NON usare per fatti generali o preferenze stabili sull'utente (usa searchSemanticMemories). Parametri: query (testo/concept), match_count opzionale (default 5).",

  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Testo o concetto da cercare nelle memorie episodiche. Restituisce gli episodi più simili per significato.",
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

      const response = await fetch("/api/memory/episodic/search", {
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
            errorMessage: data.message || data.errorMessage || "Errore nella ricerca episodica.",
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
      console.error("[searchEpisodicMemoriesTool] Errore:", error);
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
