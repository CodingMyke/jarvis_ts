import type { SystemToolDefinition } from "../types";

export const CREATE_EPISODIC_MEMORY_TOOL_NAME = "createEpisodicMemory";

/**
 * Tool per creare una memoria episodica.
 * Chiama l'API /api/memory/episodic (POST). Richiede autenticazione Supabase.
 */
export const createEpisodicMemoryTool: SystemToolDefinition = {
  name: CREATE_EPISODIC_MEMORY_TOOL_NAME,

  description:
    "Sii propenso a salvare in memoria episodi ed eventi che l’utente condivide, appuntamenti, decisioni, esperienze, dettagli di conversazioni che potrebbero servire in futuro. " +
    "Salva con una soglia bassa: se potrebbe essere utile ricordarlo, salvalo. Non limitarti solo a cose 'molto importanti'. " +
    "Durante un dialogo normale non dire che hai salvato; rispondi solo sul contenuto. Se l'utente ti chiede esplicitamente di ricordare qualcosa (es. 'ricordamelo', 'salvalo') allora conferma che l'hai fatto (es. 'fatto', 'me lo ricorderò'). " +
    "ttl_days: assegna SEMPRE un valore in giorni in base all'importanza, tranne per informazioni davvero fondamentali da ricordare per sempre (in quel caso ometti il campo). " +
    "Esempi: conversazioni casuali o dettagli minori 7-30 giorni; appuntamenti, eventi, decisioni operative 30-90; cose rilevanti a medio termine 90-365. " +
    "Lascia ttl_days vuoto (memoria permanente) SOLO per info importanti e sensate da tenere per sempre (es. decisioni di vita, dati che l'utente vuole ricordati a lungo). " +
    "EVITA DUPLICATI: prima di creare, usa searchEpisodicMemories con una query legata all'episodio che vuoi salvare. Se trovi una memoria che si riferisce allo STESSO evento/episodio (stessa riunione, stesso appuntamento, stessa decisione), NON creare una nuova: usa updateEpisodicMemory con quell'id e un content che unisce il contenuto esistente con le nuove informazioni. Crea una nuova memoria SOLO se non esiste un record che si riferisce esattamente alla stessa cosa. Se due episodi sono solo simili ma distinti (es. due riunioni diverse con la stessa persona), crea un nuovo record.",

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
