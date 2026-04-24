import type { SystemToolDefinition } from "../types";

export const CREATE_SEMANTIC_MEMORY_TOOL_NAME = "createSemanticMemory";

/**
 * Tool per creare una memoria semantica.
 * Chiama l'API /api/memory/semantic (POST). Richiede autenticazione Supabase.
 */
export const createSemanticMemoryTool: SystemToolDefinition = {
  name: CREATE_SEMANTIC_MEMORY_TOOL_NAME,

  description: `Memoria SEMANTICA: salva UNA singola informazione atemporale sull'utente (chi è, cosa preferisce, passioni, come funziona per lui). USA per: preferenze, passioni e interessi (anche se detti di sfuggita, es. "ha la mia stessa passione per X" → salva "l'utente ha passione per X"), fatti personali stabili (lavoro, familiari, nomi di fratelli/cugini), caratteristiche e abitudini. NON usare per eventi, conversazioni, appuntamenti → memoria episodica. Estrai OGNI fatto distinto sull'utente da ogni frase (anche impliciti: "mi piace X perché Y" → salva sia X che Y se Y è un fatto sull'utente). Chiama il tool più volte per ogni fatto semantico distinto. Esempi: "Preferisce il caffè senza zucchero", "Ha passione per lo sviluppo web", "Suo cugino si chiama Simone". Il server aggiorna record simili.`,

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
    console.log("[createSemanticMemoryTool] execute started, args:", { content: (args.content as string)?.slice(0, 80), key: args.key });
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

      console.log("[createSemanticMemoryTool] calling POST /api/memory/semantic");
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
