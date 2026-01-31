import type { SystemToolDefinition } from "../types";

export const CREATE_EPISODIC_MEMORY_TOOL_NAME = "createEpisodicMemory";

/**
 * Tool per creare una memoria episodica.
 * Chiama l'API /api/memory/episodic (POST). Richiede autenticazione Supabase.
 */
export const createEpisodicMemoryTool: SystemToolDefinition = {
  name: CREATE_EPISODIC_MEMORY_TOOL_NAME,

  description:
    "Memoria EPISODICA: solo cose che SONO SUCCESSE in un momento o contesto specifico (quando/dove/in quale conversazione). USA per: eventi, appuntamenti, decisioni prese in un certo contesto, dettagli di una conversazione, \"l'altro giorno abbiamo parlato di...\", esperienze. NON usare per fatti atemporali (preferenze, chi è, abitudini) — quelli vanno in memoria semantica. Esempi corretti: \"Riunione con Mario il 30/01 per il progetto X\", \"Oggi ha deciso di usare React per il nuovo corso\". Salva con soglia bassa; ttl_days: assegna in base all'importanza (7-30 minori, 30-90 eventi, 90-365 medio termine); ometti solo per info da tenere per sempre. Usa SOLO questo tool (no search per deduplicazione); il server aggiorna record simili.",

  parameters: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description:
          "Descrizione di qualcosa che È SUCCESSO (evento, conversazione, decisione in un contesto). Esempi: 'Riunione con Mario il 30/01 per il progetto X', 'Oggi ha deciso di usare React per il corso'.",
      },
      importance: {
        type: "string",
        description:
          "Livello di importanza opzionale: 'low', 'medium' (default), 'high'.",
      },
      ttl_days: {
        type: "number",
        description:
          "Giorni dopo i quali la memoria scade. Omettere SOLO per informazioni davvero importanti da ricordare per sempre. " +
          "Per tutto il resto assegna un valore: es. 7-30 (dettagli minori/casual), 30-90 (eventi/appuntamenti), 90-365 (rilevante a medio termine).",
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
