import type { SystemToolDefinition } from "../types";

export const CREATE_EPISODIC_MEMORY_TOOL_NAME = "createEpisodicMemory";

/**
 * Tool per creare una memoria episodica.
 * Chiama l'API /api/memory/episodic (POST). Richiede autenticazione Supabase.
 */
export const createEpisodicMemoryTool: SystemToolDefinition = {
  name: CREATE_EPISODIC_MEMORY_TOOL_NAME,

  description:
    "Memoria EPISODICA: salva UNA singola informazione che È SUCCESSO o che l'utente racconta (evento, esperienza, conversazione, decisione, cosa fatta o da fare). USA per: eventi, appuntamenti, decisioni in un contesto, dettagli di conversazione, \"l'altro giorno...\", esperienze vissute. NON usare per fatti atemporali (preferenze, chi è, abitudini) → memoria semantica. Puoi chiamare questo tool PIÙ VOLTE nello stesso turno: una chiamata per ogni informazione episodica distinta nel messaggio (1 messaggio può produrre 0, 1 o N ricordi episodici). Per ogni chiamata passa SOLO il contenuto di quell'unico \"chunk\". REGOLA: salva sempre; per cose di poco conto usa importance 'low' e ttl_days 7-14. ttl_days: 7-14 minori, 30-90 normali, 90-365 importanti. Il server aggiorna record simili.",

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
