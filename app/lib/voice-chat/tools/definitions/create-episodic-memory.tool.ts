import type { SystemToolDefinition } from "../types";

export const CREATE_EPISODIC_MEMORY_TOOL_NAME = "createEpisodicMemory";

/**
 * Tool per creare una memoria episodica.
 * Chiama l'API /api/memory/episodic (POST). Richiede autenticazione Supabase.
 */
export const createEpisodicMemoryTool: SystemToolDefinition = {
  name: CREATE_EPISODIC_MEMORY_TOOL_NAME,

  description:
    "Salva automaticamente come memoria episodica gli eventi, le esperienze o le conversazioni rilevanti che l’utente condivide, senza dover chiedere esplicitamente cosa memorizzare. " +
    "Identifica e registra informazioni significative, episodi importanti, dettagli su incontri, attività, o decisioni di cui potrebbe essere utile tenere traccia in futuro. " +
    "Esempi: un appuntamento menzionato, una decisione presa, un'esperienza raccontata.",

  parameters: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description:
          "Contenuto della memoria episodica: descrizione dell'evento o dell'episodio da ricordare. " +
          "Esempi: 'Riunione con Mario il 30/01 per il progetto X', 'Uscita al mare con la famiglia'.",
      },
      importance: {
        type: "string",
        description:
          "Livello di importanza opzionale: 'low', 'medium' (default), 'high'.",
      },
      ttl_days: {
        type: "number",
        description:
          "Giorni di vita della memoria prima della scadenza (opzionale). " +
          "Se non specificato, la memoria non scade.",
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
