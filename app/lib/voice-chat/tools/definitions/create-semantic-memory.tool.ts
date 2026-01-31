import type { SystemToolDefinition } from "../types";

export const CREATE_SEMANTIC_MEMORY_TOOL_NAME = "createSemanticMemory";

/**
 * Tool per creare una memoria semantica.
 * Chiama l'API /api/memory/semantic (POST). Richiede autenticazione Supabase.
 */
export const createSemanticMemoryTool: SystemToolDefinition = {
  name: CREATE_SEMANTIC_MEMORY_TOOL_NAME,

  description: `Sii propenso a salvare in memoria conoscenze, fatti e preferenze sull'utente quando è opportuno: preferenze (cibo, orari, strumenti), fatti personali, lavoro, progetti, familiari, informazioni che potrebbero servire in future conversazioni.
Salva con una soglia bassa: se potrebbe essere utile ricordarlo in seguito, salvalo. Non limitarti solo a cose 'molto importanti'. Esempi: preferenze (caffè senza zucchero, editor preferito), lavoro da remoto, nomi, tecnologie che usa, obiettivi menzionati.
Durante un dialogo normale non dire che hai salvato; rispondi solo sul contenuto. Se l'utente ti chiede esplicitamente di ricordare qualcosa (es. 'ricordamelo', 'salvalo') allora conferma che l'hai fatto (es. 'fatto', 'me lo ricorderò').
EVITA DUPLICATI: prima di creare, usa searchSemanticMemories con una query legata al fatto/preferenza che vuoi salvare. Se trovi una memoria che si riferisce allo STESSO fatto o alla STESSA preferenza (stesso tema, stessa entità), NON creare una nuova: usa updateSemanticMemory con quell'id e un content che unisce il contenuto esistente con le nuove informazioni. Crea una nuova memoria SOLO se non esiste un record che si riferisce esattamente alla stessa cosa. Se due ricordi sono solo simili ma distinti (es. due preferenze diverse sullo stesso argomento), crea un nuovo record.`,

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
