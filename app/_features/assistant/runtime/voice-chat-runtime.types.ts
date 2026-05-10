import type { Message } from "@/app/_features/assistant/types/speech.types";
import type { ConversationTurn } from "@/app/_features/assistant/lib/storage";
import type { GeminiVoice } from "@/app/_features/assistant/lib/config/voices.config";
import type {
  ConnectionState,
  CurrentChatContext,
  ToolExecutedHandler,
  VoiceChatError,
} from "@/app/_features/assistant/types/client.types";
import type { AssistantSessionState } from "@/app/_features/assistant/lib/session-machine";
import type {
  PersistedChatApiResponse,
  PersistedChatHistoryApiResponse,
} from "./adapters/chat-persistence.adapter";

export interface VoiceChatRuntimeSnapshot {
  connectionState: ConnectionState;
  listeningMode: AssistantSessionState;
  isMuted: boolean;
  messages: Message[];
  audioLevel: number;
  outputAudioLevel: number;
  error: VoiceChatError | null;
  chatId: string | null;
  chatTitle: string | null;
}

export interface VoiceChatRuntimeToolExecutedEvent {
  toolName: string;
  result: unknown;
}

export interface VoiceChatTransportCallbacks {
  getCurrentChatContext(): CurrentChatContext | null;
  getIsCurrentChatEmpty(): boolean;
  onAudioLevel(level: number): void;
  onDeleteChatById(id: string): Promise<{ success: boolean; error?: string }>;
  onDeleteCurrentChat(): Promise<{ success: boolean; error?: string }>;
  onDisableCompletely(): void;
  onEndConversation(): void;
  onError(error: VoiceChatError): void;
  onOutputAudioLevel(level: number): void;
  onStateChange(state: ConnectionState): void;
  onSwitchToChat(chatId: string): Promise<{ success: boolean; error?: string }>;
  onToolExecuted(toolName: string, result: unknown): void;
  onTranscript(text: string, type: "input" | "output" | "thinking"): void;
  onTurnComplete(): void;
  onCreateNewChat(): void;
}

export interface VoiceChatTransport {
  connect(): Promise<void>;
  dispose(): void;
  sendHistory(turns: ConversationTurn[], turnComplete?: boolean): void;
  sendText(text: string): void;
  setMuted(muted: boolean): void;
  startListening(): Promise<void>;
}

export interface VoiceChatWakeWordOptions {
  keyword: string;
  language: string;
  onError(error: VoiceChatError): void;
  onWakeWord(transcript: string): Promise<void> | void;
}

export interface VoiceChatWakeWordManager {
  dispose(): void;
  resume(): void;
}

export interface VoiceChatRuntimeAssistantConfig {
  assistantName: string;
  language: string;
  systemPrompt: string;
  voice: GeminiVoice;
  wakeWord: string;
}

export interface VoiceChatRuntimeDependencies {
  appendChatTurns?(
    id: string,
    turns: ConversationTurn[],
  ): Promise<PersistedChatApiResponse | null>;
  assistantConfig?: Partial<VoiceChatRuntimeAssistantConfig>;
  createChat?(turns: ConversationTurn[]): Promise<PersistedChatApiResponse | null>;
  createTransport?(callbacks: VoiceChatTransportCallbacks): VoiceChatTransport;
  createWakeWord?(options: VoiceChatWakeWordOptions): VoiceChatWakeWordManager;
  deleteChatById?(id: string): Promise<{ ok: boolean; message?: string }>;
  fetchChatById?(id: string): Promise<PersistedChatHistoryApiResponse | null>;
  initialChatId?: string | null;
}

export interface VoiceChatRuntime {
  getSnapshot(): VoiceChatRuntimeSnapshot;
  subscribe(listener: () => void): () => void;
  subscribeToolExecuted(listener: (event: VoiceChatRuntimeToolExecutedEvent) => void): () => void;
  startListening(): void;
  stopListening(): void;
  toggleMute(): void;
  deleteCurrentChat(): Promise<void>;
  dispose(): void;
}

export type VoiceChatRuntimeListener = () => void;
export type VoiceChatRuntimeToolExecutedListener = (
  event: VoiceChatRuntimeToolExecutedEvent,
) => void;
export type VoiceChatRuntimeLegacyToolExecutedHandler = ToolExecutedHandler;
