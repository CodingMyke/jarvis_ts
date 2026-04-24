// Transport
export { GeminiLiveClient, VoiceChatClient } from "./transport";

// Providers
export { GeminiProvider } from "./providers/gemini";
export type { VoiceChatProvider, ProviderEvent, ProviderEventData } from "./providers/base.provider";

// Types
export {
  VoiceChatError,
  type ConnectionState,
  type VoiceChatConfig,
  type VoiceChatClientOptions,
  type AudioFormat,
} from "../types/client.types";

export type {
  ToolDefinition,
  FunctionCall,
  FunctionResponse,
} from "../types/tools.types";

// Config
export { GEMINI_VOICES, type GeminiVoice } from "./config/voices.config";

// Audio utilities
export { WakeWordManager, type WakeWordManagerOptions } from "./audio";

// Storage
export {
  ConversationStorage,
  summarizeConversation,
  createSummaryTurns,
  type ConversationTurn,
  type SavedConversation,
} from "./storage";
export {
  transitionAssistantSession,
  type AssistantSessionEvent,
  type AssistantSessionState,
} from "./session-machine";
export {
  startWakeWordLifecycle,
  stopWakeWordLifecycle,
} from "./wake-word-lifecycle";
export {
  appendChatTurns,
  createChat,
  deleteChatById,
  fetchChatById,
  type PersistedChat,
  type PersistedChatApiResponse,
  type PersistedChatHistory,
  type PersistedChatHistoryApiResponse,
} from "./conversation-persistence";
