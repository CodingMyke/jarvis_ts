import type { SystemToolDefinition } from "../types";

export const UPDATE_EPISODIC_MEMORY_TOOL_NAME = "updateEpisodicMemory";

/**
 * Tool per aggiornare una memoria episodica.
 * Chiama l'API /api/memory/episodic (PATCH). Richiede autenticazione Supabase.
 */
export const updateEpisodicMemoryTool: SystemToolDefinition = {
  name: UPDATE_EPISODIC_MEMORY_TOOL_NAME,

  description:
    "Aggiorna una memoria episodica esistente (contenuto, importanza, ttl). " +
    "Usa questo tool quando: (1) l'utente chiede di modificare/correggere un episodio memorizzato; (2) hai trovato con searchEpisodicMemories una memoria che si riferisce allo STESSO evento e vuoi integrare nuove informazioni: in quel caso passa in content un testo che unisce il contenuto già presente con le nuove informazioni. " +
    "Usa getEpisodicMemories o searchEpisodicMemories per ottenere gli ID. " +
    "Esempi: 'correggi il ricordo sulla riunione', 'aggiorna l'episodio del mare', integrare un dettaglio in un episodio già salvato. Se l'utente ti ha chiesto esplicitamente di aggiornare/correggere un ricordo, conferma che è stato fatto (es. 'aggiornato con successo', 'fatto'). Durante un dialogo normale (aggiornamento in automatico) non annunciare l'aggiornamento; rispondi solo sul contenuto.",

  parameters: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "ID della memoria da aggiornare. Usa getEpisodicMemories per ottenere gli ID.",
      },
      content: {
        type: "string",
        description: "Nuovo contenuto della memoria (opzionale).",
      },
      importance: {
        type: "string",
        description: "Nuovo livello di importanza: 'low', 'medium', 'high' (opzionale).",
      },
      ttl_days: {
        type: "number",
        description: "Nuovi giorni di vita della memoria prima della scadenza (opzionale).",
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

      const body: {
        id: string;
        content?: string;
        importance?: string;
        ttl_days?: number | null;
      } = { id: id.trim() };
      if (args.content !== undefined && typeof args.content === "string" && args.content.trim()) {
        body.content = args.content.trim();
      }
      if (args.importance !== undefined && typeof args.importance === "string") {
        body.importance = args.importance;
      }
      if (args.ttl_days !== undefined) {
        const n = Number(args.ttl_days);
        body.ttl_days = Number.isFinite(n) ? n : undefined;
      }

      const response = await fetch("/api/memory/episodic", {
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
      console.error("[updateEpisodicMemoryTool] Errore:", error);
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
