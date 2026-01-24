import type { SessionConfig, FunctionCall } from '../types/messages.types';
import type { FunctionResponse } from '../types/tools.types';
import type { VoiceChatError } from '../types/client.types';
import type { ConversationTurn } from '../storage/types';

export type ProviderEvent = 
  | 'connected'
  | 'disconnected'
  | 'audio'
  | 'transcript'
  | 'toolCall'
  | 'turnComplete'
  | 'interrupted'
  | 'error';

export interface ProviderEventData {
  connected: void;
  disconnected: { reason: string };
  audio: { data: ArrayBuffer };
  transcript: { text: string; type: 'input' | 'output' | 'thinking' };
  toolCall: { calls: FunctionCall[] };
  turnComplete: void;
  interrupted: void;
  error: { error: VoiceChatError };
}

export type ProviderEventHandler<E extends ProviderEvent> = (data: ProviderEventData[E]) => void;

/**
 * Interfaccia base per tutti i provider di voice chat.
 * Permette di implementare provider alternativi (es. OpenAI, Anthropic)
 * mantenendo la stessa interfaccia verso il client.
 */
export interface VoiceChatProvider {
  readonly name: string;

  /**
   * Connette al servizio e inizializza la sessione
   */
  connect(config: SessionConfig, apiKey: string): Promise<void>;

  /**
   * Chiude la connessione
   */
  disconnect(): void;

  /**
   * Invia chunk audio al server
   */
  sendAudio(data: ArrayBuffer): void;

  /**
   * Invia testo al server (per input testuale)
   */
  sendText(text: string): void;

  /**
   * Segnala inizio attività vocale (VAD manuale)
   */
  sendActivityStart(): void;

  /**
   * Segnala fine attività vocale (VAD manuale)
   */
  sendActivityEnd(): void;

  /**
   * Invia risposte alle function calls
   */
  sendToolResponse(responses: FunctionResponse[]): void;

  /**
   * Invia la history della conversazione precedente.
   * Usato per fornire contesto a una nuova sessione.
   * @param turns - I turni della conversazione precedente
   * @param turnComplete - Se false, il modello aspetta altro input prima di rispondere
   */
  sendHistory(turns: ConversationTurn[], turnComplete?: boolean): void;

  /**
   * Registra handler per eventi
   */
  on<E extends ProviderEvent>(event: E, handler: ProviderEventHandler<E>): void;

  /**
   * Rimuove handler per eventi
   */
  off<E extends ProviderEvent>(event: E, handler: ProviderEventHandler<E>): void;

  /**
   * Rilascia tutte le risorse
   */
  dispose(): void;
}
