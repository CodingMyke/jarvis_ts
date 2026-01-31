import type { SystemToolDefinition } from "../types";

export const CREATE_SEMANTIC_MEMORY_TOOL_NAME = "createSemanticMemory";

/**
 * Tool per creare una memoria semantica.
 * Chiama l'API /api/memory/semantic (POST). Richiede autenticazione Supabase.
 */
export const createSemanticMemoryTool: SystemToolDefinition = {
  name: CREATE_SEMANTIC_MEMORY_TOOL_NAME,

  description: `Memoria SEMANTICA: solo FATTI ATEMPORALI sull'utente (chi è, cosa preferisce, come funziona per lui). USA per: preferenze (cibo, orari, strumenti, editor), fatti personali stabili (lavoro, progetti, familiari, nomi), caratteristiche e abitudini. NON usare per eventi, conversazioni specifiche, "l'altro giorno...", decisioni prese in un contesto, appuntamenti — quelli vanno in memoria episodica.
Esempi corretti: "Preferisce il caffè senza zucchero", "Lavora da remoto il martedì", "Suo fratello si chiama Marco". Salva con soglia bassa; durante il dialogo non dire che hai salvato; se l'utente chiede "ricordamelo" conferma. Usa SOLO questo tool (no search per deduplicazione); il server aggiorna record simili.`,

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
