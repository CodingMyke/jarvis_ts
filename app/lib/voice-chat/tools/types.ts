import type { ParameterProperty } from "../types/tools.types";

export type { ParameterProperty };

/**
 * Contesto passato all'execute di un tool.
 * Contiene le azioni che il tool può eseguire.
 */
export interface ToolContext {
  /** Termina la conversazione e disconnette (torna in ascolto della parola chiave) */
  endConversation: (delayMs?: number) => void;
  /** Disattiva completamente l'assistente: orb grigio, non in ascolto nemmeno della parola chiave */
  disableCompletely: (delayMs?: number) => void;
  /** Cancella tutta la chat (messaggi e storage). Stesso effetto del pulsante cestino in UI. */
  clearConversation: () => void;
}

/**
 * Risultato dell'esecuzione di un tool.
 */
export interface ToolExecuteResult {
  /** Risultato da inviare a Gemini */
  result: unknown;
}

/**
 * Definizione completa di un tool con implementazione.
 * Ogni tool ha nome, descrizione e la sua logica di esecuzione.
 */
export interface SystemToolDefinition {
  name: string;
  description: string;
  parameters?: {
    type: "object";
    properties: Record<string, ParameterProperty>;
    required?: string[];
  };
  /**
   * Implementazione del tool.
   * @param args - Argomenti passati da Gemini
   * @param context - Contesto con le azioni disponibili
   * @returns Risultato da inviare a Gemini
   */
  execute: (
    args: Record<string, unknown>,
    context: ToolContext
  ) => ToolExecuteResult | Promise<ToolExecuteResult>;
}

/**
 * Dichiarazione di un tool per Gemini API (solo metadati, senza execute).
 * Usato per costruire la configurazione della sessione.
 */
export type ToolDeclaration = Omit<SystemToolDefinition, "execute">;
