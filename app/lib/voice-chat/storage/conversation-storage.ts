import type { Message } from '@/app/lib/speech/types';
import type {
  ConversationTurn,
  SavedConversation,
  ConversationStorageConfig,
} from './types';
import { DEFAULT_STORAGE_CONFIG } from './types';

/**
 * Servizio per la persistenza delle conversazioni nel localStorage.
 */
export class ConversationStorage {
  private config: Required<ConversationStorageConfig>;

  constructor(config: ConversationStorageConfig = {}) {
    this.config = { ...DEFAULT_STORAGE_CONFIG, ...config };
  }

  /**
   * Converte i messaggi UI nel formato turns di Gemini.
   */
  messagesToTurns(messages: Message[]): ConversationTurn[] {
    return messages.map((msg) => ({
      role: msg.isUser ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));
  }

  /**
   * Conta i messaggi dell'utente.
   */
  countUserMessages(messages: Message[]): number {
    return messages.filter((msg) => msg.isUser).length;
  }

  /**
   * Verifica se la conversazione necessita di un riassunto.
   */
  needsSummarization(messages: Message[]): boolean {
    return this.countUserMessages(messages) >= this.config.summarizeThreshold;
  }

  /**
   * Salva la conversazione nel localStorage.
   */
  save(messages: Message[], isSummarized = false): void {
    if (typeof window === 'undefined') return;

    const turns = this.messagesToTurns(messages);
    const now = Date.now();

    const existing = this.load();

    const conversation: SavedConversation = {
      id: existing?.id || `conv_${now}`,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      turns,
      isSummarized,
    };

    localStorage.setItem(this.config.storageKey, JSON.stringify(conversation));
  }

  /**
   * Salva i turns già formattati (es. dopo summarization).
   */
  saveTurns(turns: ConversationTurn[], isSummarized = false): void {
    if (typeof window === 'undefined') return;

    const now = Date.now();
    const existing = this.load();

    const conversation: SavedConversation = {
      id: existing?.id || `conv_${now}`,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      turns,
      isSummarized,
    };

    localStorage.setItem(this.config.storageKey, JSON.stringify(conversation));
  }

  /**
   * Carica la conversazione dal localStorage.
   */
  load(): SavedConversation | null {
    if (typeof window === 'undefined') return null;

    const data = localStorage.getItem(this.config.storageKey);
    if (!data) return null;

    try {
      return JSON.parse(data) as SavedConversation;
    } catch {
      return null;
    }
  }

  /**
   * Cancella la conversazione dal localStorage.
   */
  clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.config.storageKey);
  }
}
