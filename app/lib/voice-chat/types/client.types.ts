import type { GeminiVoice } from '../config/voices.config';
import type { ToolDefinition } from './tools.types';

export type { AudioFormat } from './audio.types';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export type VoiceChatErrorCode =
  | 'CONNECTION_FAILED'
  | 'AUDIO_ERROR'
  | 'API_ERROR'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN_ERROR';

export class VoiceChatError extends Error {
  constructor(
    message: string,
    public readonly code: VoiceChatErrorCode,
    public readonly recoverable: boolean = false
  ) {
    super(message);
    this.name = 'VoiceChatError';
  }
}

export interface VoiceChatConfig {
  voice?: GeminiVoice;
  language?: string;
  systemPrompt?: string;
}

export interface VoiceChatClientOptions {
  provider: import('../providers/base.provider').VoiceChatProvider;
  config?: VoiceChatConfig;
  tools?: ToolDefinition[];
  onTranscript?: (text: string, type: 'input' | 'output' | 'thinking') => void;
  onStateChange?: (state: ConnectionState) => void;
  onError?: (error: VoiceChatError) => void;
  onAudioLevel?: (level: number) => void;
  onOutputAudioLevel?: (level: number) => void;
  onEndConversation?: () => void;
  /** Chiamato quando l'assistente ha terminato il suo turno (utile per avviare timeout di inattività) */
  onTurnComplete?: () => void;
  /** Chiamato quando l'assistente deve disattivarsi completamente (orb grigio, niente ascolto) */
  onDisableCompletely?: () => void;
  /** Chiamato quando l'assistente deve eliminare la chat dal database; ritorna esito per il tool. */
  onDeleteCurrentChat?: () => Promise<{ success: boolean; error?: string }>;
  /** Chiamato quando l'assistente deve eliminare una chat per id (qualsiasi chat). Ritorna esito per il tool. */
  onDeleteChatById?: (id: string) => Promise<{ success: boolean; error?: string }>;
  /** Chiamato quando l'assistente passa a un'altra chat: termina conversazione e riapre quella chat. */
  onSwitchToChat?: (chatId: string) => void;
  /** Chiamato quando l'assistente crea una nuova chat: il messaggio corrente non viene salvato e non riceve risposta; si passa alla nuova chat. */
  onCreateNewChat?: () => void;
  /** Restituisce true se la chat corrente è vuota o senza conversazione sostanziale (per evitare di creare una nuova chat quando l'utente è già su una nuova). */
  getIsCurrentChatEmpty?: () => boolean;
  onToolExecuted?: (toolName: string, result: unknown) => void;
}
