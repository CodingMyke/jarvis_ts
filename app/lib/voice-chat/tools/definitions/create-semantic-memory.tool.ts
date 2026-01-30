import type { SystemToolDefinition } from "../types";

export const CREATE_SEMANTIC_MEMORY_TOOL_NAME = "createSemanticMemory";

/**
 * Tool per creare una memoria semantica.
 * Chiama l'API /api/memory/semantic (POST). Richiede autenticazione Supabase.
 */
export const createSemanticMemoryTool: SystemToolDefinition = {
  name: CREATE_SEMANTIC_MEMORY_TOOL_NAME,

  description: `Salva una memoria semantica (conoscenza, fatto o preferenza dell'utente).
Di norma usa questo tool quando l'utente ti comunica qualcosa che merita di essere ricordato su di lui: preferenze,
fatti personali, informazioni utili per le prossime conversazioni. Tuttavia, se a tuo giudizio ritieni che un'informazione possa essere rilevante anche senza una richiesta esplicita,
puoi salvarla autonomamente su questa tabella.
Esempi: 'ricordati che preferisco il caffè senza zucchero', 'memorizza che lavoro da remoto',
'io ho un figlio che si chiama Luca'.`,

  parameters: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description:
          "Contenuto della memoria da salvare: il fatto, la preferenza o l'informazione da ricordare. " +
          "Esempi: 'Preferisce il caffè senza zucchero', 'Lavora da remoto il martedì e giovedì'.",
      },
      key: {
        type: "string",
        description:
          "Chiave opzionale per raggruppare o identificare la memoria (es. 'preferenze_caffe', 'lavoro').",
      },
      importance: {
        type: "string",
        description:
          "Livello di importanza opzionale: 'low', 'medium' (default), 'high'.",
      },
    },
    required: ["content"],
  },

  execute: async (args) => {
    try {
      const content = args.content as string | undefined;
      if (typeof content !== "string" || !content.trim()) {
        return {
          result: {
            success: false,
            error: "INVALID_CONTENT",
            errorMessage: "Il contenuto della memoria non può essere vuoto",
          },
        };
      }

      const response = await fetch("/api/memory/semantic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: content.trim(),
          key: (args.key as string)?.trim() || undefined,
          importance: (args.importance as string) || undefined,
        }),
      });
      const data = await response.json();

      if (response.status === 401) {
        return {
          result: {
            success: false,
            error: "UNAUTHORIZED",
            errorMessage:
              "Utente non autenticato. Effettua il login per salvare memorie.",
          },
        };
      }

      if (!response.ok || !data.success) {
        return {
          result: {
            success: false,
            error: data.error || "CREATION_FAILED",
            errorMessage:
              data.message ||
              data.errorMessage ||
              "Errore durante il salvataggio della memoria",
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
      console.error("[createSemanticMemoryTool] Errore:", error);
      return {
        result: {
          success: false,
          error: "EXECUTION_ERROR",
          errorMessage:
            error instanceof Error ? error.message : "Errore sconosciuto",
        },
      };
    }
  },
};
