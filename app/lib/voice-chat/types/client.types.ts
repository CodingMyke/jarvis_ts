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
  onEndConversation?: () => void;
}
