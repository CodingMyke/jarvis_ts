export {
  VoiceChatError,
  type ConnectionState,
  type VoiceChatErrorCode,
  type AudioFormat,
  type VoiceChatConfig,
  type VoiceChatClientOptions,
} from './client.types';

export * from './audio.types';

// Export messages types (escludi tipi duplicati)
export type {
  GenerationConfig,
  SystemInstruction,
  RealtimeInputConfig,
  Tool,
  FunctionDeclaration,
  SessionConfig,
  SetupMessage,
  RealtimeInputMessage,
  ToolResponseMessage,
  ClientMessage,
  Part,
  ModelTurn,
  ServerContent,
  ToolCall,
  UsageMetadata,
  ServerMessage,
} from './messages.types';

// Export tools types (questi sono i tipi principali usati esternamente)
export type {
  ParameterProperty,
  ToolDefinition,
  FunctionCall,
  FunctionResponse,
} from './tools.types';
