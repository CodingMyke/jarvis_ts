import type { Message } from "@/app/_features/assistant/types/speech.types";
import type {
  ConnectionState,
  ToolExecutedHandler,
  VoiceChatError,
} from "@/app/_features/assistant/types/client.types";
import type { AssistantSessionState } from "@/app/_features/assistant/lib/session-machine";

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

export interface VoiceChatRuntimeDependencies {
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
