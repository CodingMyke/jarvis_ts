import type { SystemToolDefinition } from "../types";

export const DELETE_SEMANTIC_MEMORY_TOOL_NAME = "deleteSemanticMemory";

/**
 * Tool per eliminare una memoria semantica.
 * Chiama l'API /api/memory/semantic (DELETE). Richiede autenticazione Supabase.
 */
export const deleteSemanticMemoryTool: SystemToolDefinition = {
  name: DELETE_SEMANTIC_MEMORY_TOOL_NAME,

  description:
    "Elimina una memoria semantica dall'archivio dell'utente. " +
    "Usa questo tool quando l'utente chiede di cancellare un ricordo, di dimenticare qualcosa, " +
    "o di rimuovere una preferenza memorizzata. Usa getSemanticMemories per ottenere gli ID. " +
    "Esempi: 'cancella il ricordo sul caffè', 'dimentica che lavoro da remoto', 'rimuovi quella memoria'.",

  parameters: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "ID della memoria da eliminare. Usa getSemanticMemories per ottenere gli ID.",
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

      const response = await fetch(`/api/memory/semantic?id=${encodeURIComponent(id.trim())}`, {
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
      console.error("[deleteSemanticMemoryTool] Errore:", error);
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
