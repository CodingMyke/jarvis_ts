import type { SessionConfig, FunctionCall } from '../../types/messages.types';
import type { FunctionResponse } from '../../types/tools.types';
import type { ConversationTurn } from '../../storage/types';
import { VoiceChatError } from '../../types/client.types';
import type {
  VoiceChatProvider,
  ProviderEvent,
  ProviderEventHandler,
  ProviderEventData,
} from '../base.provider';
import {
  buildSetupMessage,
  buildAudioMessage,
  buildActivityStartMessage,
  buildActivityEndMessage,
  buildToolResponseMessage,
  buildHistoryMessage,
  parseServerMessage,
} from './gemini-messages';
import { GEMINI_MODEL } from '../../config';

const GEMINI_WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

type EventListeners = {
  [E in ProviderEvent]: Set<ProviderEventHandler<E>>;
};

/**
 * Provider per Gemini Live API.
 * Gestisce la connessione WebSocket e la comunicazione bidirezionale.
 */
export class GeminiProvider implements VoiceChatProvider {
  readonly name = 'gemini';

  private ws: WebSocket | null = null;
  private listeners: EventListeners = {
    connected: new Set(),
    disconnected: new Set(),
    audio: new Set(),
    transcript: new Set(),
    toolCall: new Set(),
    turnComplete: new Set(),
    interrupted: new Set(),
    error: new Set(),
  };

  async connect(config: SessionConfig, apiKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${GEMINI_WS_URL}?key=${apiKey}`;
      console.log('[GeminiProvider] connecting to:', url.replace(apiKey, 'API_KEY_HIDDEN'));
      
      this.ws = new WebSocket(url);
      
      let isSetupComplete = false;

      this.ws.onopen = () => {
        console.log('[GeminiProvider] WebSocket opened, sending setup...');
        const setupMsg = buildSetupMessage(config);
        this.ws?.send(JSON.stringify(setupMsg));
      };

      this.ws.onmessage = async (event) => {
        // Converti Blob in testo se necessario
        const data = event.data instanceof Blob 
          ? await event.data.text() 
          : event.data;
        
        const message = parseServerMessage(data);
        
        // Risolvi dopo setupComplete
        if (message?.setupComplete && !isSetupComplete) {
          console.log('[GeminiProvider] setup complete!');
          isSetupComplete = true;
          this.emit('connected', undefined);
          resolve();
        }
        
        this.handleMessageData(data);
      };

      this.ws.onerror = (event) => {
        console.error('[GeminiProvider] WebSocket error:', event);
        const error = new VoiceChatError(
          'WebSocket connection failed',
          'CONNECTION_FAILED',
          true
        );
        this.emit('error', { error });
        reject(error);
      };

      this.ws.onclose = (event) => {
        const reason = event.reason || '(nessuna)';
        const motivation = `code=${event.code} reason="${reason}" wasClean=${event.wasClean}`;
        console.log('[GeminiProvider] WebSocket chiuso. Motivazione:', motivation);
        this.emit('disconnected', { reason: event.reason || 'Connection closed' });
        
        // Se non abbiamo completato il setup, reject la promise
        if (!isSetupComplete) {
          reject(new VoiceChatError(
            `Connection closed: ${event.reason || `code ${event.code}`}`,
            'CONNECTION_FAILED',
            true
          ));
        }
      };
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  sendAudio(data: ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    const msg = buildAudioMessage(data);
    this.ws.send(JSON.stringify(msg));
  }

  sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    // Per ora invio testo come client_content
    const msg = {
      clientContent: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      },
    };
    this.ws.send(JSON.stringify(msg));
  }

  sendActivityStart(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    const msg = buildActivityStartMessage();
    this.ws.send(JSON.stringify(msg));
  }

  sendActivityEnd(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    const msg = buildActivityEndMessage();
    this.ws.send(JSON.stringify(msg));
  }

  sendToolResponse(responses: FunctionResponse[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[GeminiProvider] Cannot send tool response: WebSocket not open');
      return;
    }
    
    console.log('[GeminiProvider] Sending tool responses:', responses.length, responses.map(r => ({ name: r.name, id: r.id, hasError: !!r.response.error })));
    const msg = buildToolResponseMessage(responses);
    this.ws.send(JSON.stringify(msg));
  }

  sendHistory(turns: ConversationTurn[], turnComplete = false): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    const msg = buildHistoryMessage(turns, turnComplete);
    this.ws.send(JSON.stringify(msg));
  }

  on<E extends ProviderEvent>(event: E, handler: ProviderEventHandler<E>): void {
    this.listeners[event].add(handler as ProviderEventHandler<ProviderEvent>);
  }

  off<E extends ProviderEvent>(event: E, handler: ProviderEventHandler<E>): void {
    this.listeners[event].delete(handler as ProviderEventHandler<ProviderEvent>);
  }

  dispose(): void {
    this.disconnect();
    
    // Clear all listeners
    for (const key of Object.keys(this.listeners) as ProviderEvent[]) {
      this.listeners[key].clear();
    }
  }

  private emit<E extends ProviderEvent>(event: E, data: ProviderEventData[E]): void {
    for (const handler of this.listeners[event]) {
      (handler as ProviderEventHandler<E>)(data);
    }
  }

  private handleMessageData(data: string): void {
    const message = parseServerMessage(data);
    if (!message) return;

    // Audio response
    if (message.serverContent?.modelTurn?.parts) {
      for (const part of message.serverContent.modelTurn.parts) {
        // Audio data
        if (part.inlineData?.data) {
          const binaryStr = atob(part.inlineData.data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          this.emit('audio', { data: bytes.buffer });
        }
        
        // Text transcript (solo thinking, output arriva da outputTranscription)
        if (part.text && part.thought) {
          this.emit('transcript', { text: part.text, type: 'thinking' });
        }
      }
    }

    // Input transcript
    if (message.serverContent?.inputTranscription?.text) {
      this.emit('transcript', { 
        text: message.serverContent.inputTranscription.text, 
        type: 'input' 
      });
    }

    // Output transcript - rimuovi caratteri ripetuti anomali alla fine
    if (message.serverContent?.outputTranscription?.text) {
      let text = message.serverContent.outputTranscription.text;
      // Rimuovi sequenze di caratteri ripetuti alla fine (es. "1111111" o "......")
      text = text.replace(/(.)\1{5,}$/, '');
      if (text.trim()) {
        this.emit('transcript', { 
          text, 
          type: 'output' 
        });
      }
    }

    // Turn complete
    if (message.serverContent?.turnComplete) {
      this.emit('turnComplete', undefined);
    }

    // Interrupted
    if (message.serverContent?.interrupted) {
      this.emit('interrupted', undefined);
    }

    // Tool calls
    if (message.toolCall?.functionCalls) {
      console.log('[GeminiProvider] Received tool calls:', message.toolCall.functionCalls.length, message.toolCall.functionCalls.map(c => c.name));
      this.emit('toolCall', { calls: message.toolCall.functionCalls });
    }
  }
}
