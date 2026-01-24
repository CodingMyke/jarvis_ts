/**
 * Rappresenta un singolo turno della conversazione.
 * Compatibile con il formato richiesto da Gemini clientContent.
 */
export interface ConversationTurn {
  role: 'user' | 'model';
  parts: { text: string }[];
}

/**
 * Conversazione salvata nel localStorage.
 */
export interface SavedConversation {
  /** ID univoco della conversazione */
  id: string;
  /** Timestamp di creazione */
  createdAt: number;
  /** Timestamp ultimo aggiornamento */
  updatedAt: number;
  /** Turni della conversazione (escluso system prompt) */
  turns: ConversationTurn[];
  /** Se true, i turns contengono un riassunto invece della conversazione completa */
  isSummarized: boolean;
}

/**
 * Configurazione per il salvataggio della conversazione.
 */
export interface ConversationStorageConfig {
  /** Chiave localStorage per la conversazione */
  storageKey?: string;
  /** Numero minimo di messaggi utente per attivare il riassunto */
  summarizeThreshold?: number;
}

export const DEFAULT_STORAGE_CONFIG: Required<ConversationStorageConfig> = {
  storageKey: 'jarvis_conversation',
  summarizeThreshold: 20,
};
