/**
 * Rappresenta un singolo turno della conversazione.
 * Compatibile con il formato richiesto da Gemini clientContent.
 */
export interface ConversationTurn {
  role: 'user' | 'model';
  parts: { text: string }[];
  /** Ragionamento del modello (solo per role 'model') - non inviato a Gemini */
  thinking?: string;
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
}

/**
 * Configurazione per il salvataggio della conversazione.
 */
export interface ConversationStorageConfig {
  /** Chiave localStorage per la conversazione */
  storageKey?: string;
}

export const DEFAULT_STORAGE_CONFIG: Required<ConversationStorageConfig> = {
  storageKey: 'jarvis_conversation',
};
