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
  /** Elimina la chat corrente dal database e riapre in stato pulito. Ritorna esito per il tool. */
  deleteCurrentChat: () => Promise<{ success: boolean; error?: string }>;
  /** Elimina una chat per id (qualsiasi chat). Se id è la chat corrente, il client può riconnettere; altrimenti solo DELETE API. Ritorna esito. */
  deleteChatById?: (id: string) => Promise<{ success: boolean; error?: string }>;
  /** Passa a un'altra chat: termina la conversazione corrente e riapre quella chat. Ritorna esito (success/error) per il tool. */
  switchToChat?: (chatId: string) => void | Promise<{ success: boolean; error?: string }>;
  /** Crea una nuova chat e passa a essa. Il messaggio corrente ("crea nuova chat") non viene salvato nella chat attuale e non riceve risposta. */
  createNewChat?: () => void;
  /** Restituisce true se la chat corrente è vuota o non contiene conversazione sostanziale (es. solo wake word / saluto). */
  getIsCurrentChatEmpty?: () => boolean;
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
