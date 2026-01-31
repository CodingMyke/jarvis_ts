import type { SystemToolDefinition } from "../types";

export const UPDATE_SEMANTIC_MEMORY_TOOL_NAME = "updateSemanticMemory";

/**
 * Tool per aggiornare una memoria semantica.
 * Chiama l'API /api/memory/semantic (PATCH). Richiede autenticazione Supabase.
 */
export const updateSemanticMemoryTool: SystemToolDefinition = {
  name: UPDATE_SEMANTIC_MEMORY_TOOL_NAME,

  description:
    "Aggiorna una memoria semantica esistente (contenuto, chiave o importanza). " +
    "Usa questo tool quando: (1) l'utente chiede di modificare/correggere qualcosa che avevi memorizzato; (2) hai trovato con searchSemanticMemories una memoria che si riferisce allo STESSO fatto/preferenza e vuoi integrare nuove informazioni: in quel caso passa in content un testo che unisce il contenuto già presente con le nuove informazioni. " +
    "Usa getSemanticMemories o searchSemanticMemories per ottenere gli ID. " +
    "Esempi: 'correggi il ricordo sul caffè, prendo due zuccheri', 'aggiorna la memoria sul lavoro', integrare un dettaglio in un fatto già salvato.",

  parameters: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "ID della memoria da aggiornare. Usa getSemanticMemories per ottenere gli ID.",
      },
      content: {
        type: "string",
        description: "Nuovo contenuto della memoria (opzionale).",
      },
      key: {
        type: "string",
        description: "Nuova chiave opzionale (opzionale).",
      },
      importance: {
        type: "string",
        description: "Nuovo livello di importanza: 'low', 'medium', 'high' (opzionale).",
      },
    },
    required: ["id"],
  },

  execute: async (args) => {
    try {
      const id = args.id as string | undefined;
      if (typeof id !== "string" || !id.trim()) {
        return {
          result: {
            success: false,
            error: "MISSING_ID",
            errorMessage: "L'id della memoria è obbligatorio",
          },
        };
      }

      const body: { id: string; content?: string; key?: string; importance?: string } = {
        id: id.trim(),
      };
      if (args.content !== undefined && typeof args.content === "string" && args.content.trim()) {
        body.content = args.content.trim();
      }
      if (args.key !== undefined) body.key = typeof args.key === "string" ? args.key : undefined;
      if (args.importance !== undefined && typeof args.importance === "string") {
        body.importance = args.importance;
      }

      const response = await fetch("/api/memory/semantic", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (response.status === 401) {
        return {
          result: {
            success: false,
            error: "UNAUTHORIZED",
            errorMessage: "Utente non autenticato.",
          },
        };
      }

      if (response.status === 404) {
        return {
          result: {
            success: false,
            error: "NOT_FOUND",
            errorMessage: data.message || "Memoria non trovata",
          },
        };
      }

      if (!response.ok || !data.success) {
        return {
          result: {
            success: false,
            error: data.error || "UPDATE_FAILED",
            errorMessage: data.message || data.errorMessage || "Errore durante l'aggiornamento",
          },
        };
      }

      return {
        result: {
          success: true,
          memory: data.memory,
        },
      };
    } catch (error) {
      console.error("[updateSemanticMemoryTool] Errore:", error);
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
