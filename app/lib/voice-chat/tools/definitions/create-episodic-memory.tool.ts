import type { SystemToolDefinition } from "../types";

export const CREATE_EPISODIC_MEMORY_TOOL_NAME = "createEpisodicMemory";

/**
 * Tool per creare una memoria episodica.
 * Chiama l'API /api/memory/episodic (POST). Richiede autenticazione Supabase.
 */
export const createEpisodicMemoryTool: SystemToolDefinition = {
  name: CREATE_EPISODIC_MEMORY_TOOL_NAME,

  description:
    "Memoria EPISODICA: salva TUTTE le cose che SONO SUCCESSE o che l'utente racconta (esperienze, cose fatte, cose che vorrebbe fare, interessi menzionati in un contesto). USA per: eventi, appuntamenti, decisioni in un contesto, dettagli di conversazione, \"l'altro giorno...\", esperienze vissute, cose che ha fatto o vuole fare, argomenti di interesse. NON usare per fatti atemporali (preferenze stabili, chi è, abitudini) — quelli vanno in memoria semantica. REGOLA: salva sempre; se ritieni qualcosa di poco conto usa importance 'low' e ttl_days basso (es. 7-14), ma non omettere. ttl_days: 7-14 minori/poco conto, 30-90 eventi normali, 90-365 importante; ometti solo per info da tenere per sempre. Usa SOLO questo tool (no search per deduplicazione); il server aggiorna record simili.",

  parameters: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description:
          "Descrizione di qualcosa che è successo o che l'utente ha raccontato: evento, esperienza, conversazione, decisione, cosa fatta o da fare, interesse menzionato. Esempi: 'Riunione con Mario il 30/01', 'Ha raccontato del viaggio a Roma', 'Vuole provare il corso di nuoto', 'Interessato al progetto X'.",
      },
      importance: {
        type: "string",
        description:
          "Livello di importanza: 'low' (cose di poco conto — salva comunque), 'medium' (default), 'high'.",
      },
      ttl_days: {
        type: "number",
        description:
          "Giorni dopo i quali la memoria scade. Per cose di poco conto usa 7-14. Per eventi normali 30-90, per cose importanti 90-365. Omettere solo per info da tenere per sempre.",
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

      const body: { content: string; importance?: string; ttl_days?: number } = {
        content: content.trim(),
      };
      if (args.importance !== undefined && typeof args.importance === "string") {
        body.importance = args.importance;
      }
      if (args.ttl_days !== undefined) {
        const n = Number(args.ttl_days);
        if (Number.isFinite(n) && n >= 0) body.ttl_days = n;
      }

      const response = await fetch("/api/memory/episodic", {
        method: "POST",
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
            errorMessage: "Utente non autenticato. Effettua il login per salvare memorie.",
          },
        };
      }

      if (!response.ok || !data.success) {
        return {
          result: {
            success: false,
            error: data.error || "CREATION_FAILED",
            errorMessage: data.message || data.errorMessage || "Errore durante il salvataggio della memoria",
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
      console.error("[createEpisodicMemoryTool] Errore:", error);
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
