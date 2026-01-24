// Client
export { VoiceChatClient } from './client';

// Providers
export { createGeminiProvider, GeminiProvider } from './providers/gemini';
export type { VoiceChatProvider, ProviderEvent, ProviderEventData } from './providers/base.provider';

// Types
export {
  VoiceChatError,
  type ConnectionState,
  type VoiceChatConfig,
  type VoiceChatClientOptions,
  type AudioFormat,
} from './types/client.types';

export type {
  ToolDefinition,
  FunctionCall,
  FunctionResponse,
} from './types/tools.types';

// Config
export { GEMINI_VOICES, type GeminiVoice } from './config/voices.config';

// Audio utilities
export { WakeWordManager, type WakeWordManagerOptions } from './audio';

// Storage
export {
  ConversationStorage,
  summarizeConversation,
  createSummaryTurns,
  type ConversationTurn,
  type SavedConversation,
} from './storage';
