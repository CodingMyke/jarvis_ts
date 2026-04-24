import type { SystemToolDefinition } from "../types";

export const DELETE_EPISODIC_MEMORY_TOOL_NAME = "deleteEpisodicMemory";

/**
 * Tool per eliminare una memoria episodica.
 * Chiama l'API /api/memory/episodic (DELETE). Richiede autenticazione Supabase.
 */
export const deleteEpisodicMemoryTool: SystemToolDefinition = {
  name: DELETE_EPISODIC_MEMORY_TOOL_NAME,

  description:
    "Elimina una memoria episodica dall'archivio dell'utente. " +
    "Usa questo tool quando l'utente chiede di cancellare un episodio memorizzato, " +
    "di dimenticare un evento o di rimuovere una memoria. Usa getEpisodicMemories per ottenere gli ID. " +
    "Esempi: 'cancella il ricordo sulla riunione', 'dimentica l'episodio del mare', 'rimuovi quella memoria episodica'.",

  parameters: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "ID della memoria da eliminare. Usa getEpisodicMemories per ottenere gli ID.",
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

      const response = await fetch(`/api/memory/episodic?id=${encodeURIComponent(id.trim())}`, {
        method: "DELETE",
        credentials: "include",
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

      if (!response.ok || !data.success) {
        return {
          result: {
            success: false,
            error: data.error || "DELETE_FAILED",
            errorMessage: data.message || data.errorMessage || "Errore durante l'eliminazione",
          },
        };
      }

      return {
        result: {
          success: true,
          deleted: { id: id.trim() },
        },
      };
    } catch (error) {
      console.error("[deleteEpisodicMemoryTool] Errore:", error);
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
