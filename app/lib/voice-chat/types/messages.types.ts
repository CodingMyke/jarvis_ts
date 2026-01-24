// ============================================
// Client -> Server Messages
// ============================================

export interface GenerationConfig {
  responseModalities: ('AUDIO' | 'TEXT')[];
  speechConfig?: {
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: string;
      };
    };
  };
}

export interface SystemInstruction {
  parts: { text: string }[];
}

export interface RealtimeInputConfig {
  automaticActivityDetection?: {
    disabled: boolean;
  };
}

export interface Tool {
  functionDeclarations?: FunctionDeclaration[];
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters?: {
    type: string;
    properties: Record<string, ParameterProperty>;
    required?: string[];
  };
}

export interface ParameterProperty {
  type: string;
  description: string;
  enum?: string[];
}

export interface SessionConfig {
  model: string;
  generationConfig: GenerationConfig;
  systemInstruction?: SystemInstruction;
  tools?: Tool[];
  realtimeInputConfig?: RealtimeInputConfig;
  inputAudioTranscription?: Record<string, never>;
  outputAudioTranscription?: Record<string, never>;
  contextWindowCompression?: { slidingWindow: Record<string, never> };
}

export interface SetupMessage {
  setup: SessionConfig;
}

export interface RealtimeInputMessage {
  realtimeInput: {
    audio?: { data: string; mimeType: string };
    activityStart?: Record<string, never>;
    activityEnd?: Record<string, never>;
    audioStreamEnd?: boolean;
  };
}

export interface ToolResponseMessage {
  toolResponse: {
    functionResponses: FunctionResponse[];
  };
}

export interface FunctionResponse {
  id: string;
  name: string;
  response: {
    result: string;
    error?: string;
  };
}

export type ClientMessage = SetupMessage | RealtimeInputMessage | ToolResponseMessage;

// ============================================
// Server -> Client Messages
// ============================================

export interface Part {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  thought?: boolean;
}

export interface ModelTurn {
  parts?: Part[];
}

export interface ServerContent {
  modelTurn?: ModelTurn;
  turnComplete?: boolean;
  interrupted?: boolean;
  generationComplete?: boolean;
  inputTranscription?: { text: string };
  outputTranscription?: { text: string };
}

export interface FunctionCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolCall {
  functionCalls: FunctionCall[];
}

export interface UsageMetadata {
  promptTokenCount?: number;
  responseTokenCount?: number;
  totalTokenCount?: number;
}

export interface ServerMessage {
  setupComplete?: Record<string, never>;
  serverContent?: ServerContent;
  toolCall?: ToolCall;
  toolCallCancellation?: { ids: string[] };
  usageMetadata?: UsageMetadata;
  goAway?: { timeLeft: string };
}
