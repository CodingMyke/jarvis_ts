import type { Message } from "@/app/_features/assistant/types/speech.types";
import type { ConversationTurn } from "@/app/_features/assistant/lib/storage";
import type { VoiceChatRuntimeListener, VoiceChatRuntimeSnapshot } from "./voice-chat-runtime.types";

interface VoiceChatRuntimeStoreChatHistory {
  title?: string | null;
  created_at?: string;
  last_activity_at?: string;
  full_history: ConversationTurn[];
  assistant_history: ConversationTurn[];
}

interface VoiceChatRuntimeStoreChatMetadata {
  createdAt: string | null;
  lastActivityAt: string | null;
}

interface CurrentMessageIds {
  user: string | null;
  ai: string | null;
}

export interface VoiceChatRuntimeStore {
  clearChatState(nextChatId?: string | null): void;
  getAssistantHistory(): ConversationTurn[];
  getChatMetadata(): VoiceChatRuntimeStoreChatMetadata;
  getCurrentMessageIds(): CurrentMessageIds;
  getLastSavedTurnCount(): number;
  getSnapshot(): VoiceChatRuntimeSnapshot;
  setAudioLevel(level: number): void;
  setAssistantHistory(turns: ConversationTurn[]): void;
  setChatId(chatId: string | null): void;
  setChatStateFromHistory(chatId: string, history: VoiceChatRuntimeStoreChatHistory): void;
  setConnectionState(state: VoiceChatRuntimeSnapshot["connectionState"]): void;
  setCurrentMessageIds(ids: Partial<CurrentMessageIds>): void;
  setError(error: VoiceChatRuntimeSnapshot["error"]): void;
  setLastSavedTurnCount(count: number): void;
  setListeningMode(mode: VoiceChatRuntimeSnapshot["listeningMode"]): void;
  setMessages(messages: Message[]): void;
  setMuted(isMuted: boolean): void;
  setOutputAudioLevel(level: number): void;
  subscribe(listener: VoiceChatRuntimeListener): () => void;
  updateChatMetadata(metadata: {
    title?: string | null;
    createdAt?: string | null;
    lastActivityAt?: string | null;
  }): void;
}

const DEFAULT_SNAPSHOT: VoiceChatRuntimeSnapshot = {
  connectionState: "disconnected",
  listeningMode: "idle",
  isMuted: false,
  messages: [],
  audioLevel: 0,
  outputAudioLevel: 0,
  error: null,
  chatId: null,
  chatTitle: null,
};

function cloneMessages(messages: Message[]): Message[] {
  return Object.freeze(messages.map((message) => Object.freeze({ ...message }))) as Message[];
}

function createPublicSnapshot(snapshot: VoiceChatRuntimeSnapshot): VoiceChatRuntimeSnapshot {
  return Object.freeze({
    ...snapshot,
    messages: cloneMessages(snapshot.messages),
  }) as VoiceChatRuntimeSnapshot;
}

function projectTurnsToMessages(turns: ConversationTurn[]): Message[] {
  return turns.map((turn, index) => ({
    id: `history-${index}`,
    text: turn.parts.map((part) => part.text).join(" "),
    isUser: turn.role === "user",
    thinking: turn.thinking,
  }));
}

export function createVoiceChatRuntimeStore(): VoiceChatRuntimeStore {
  const listeners = new Set<VoiceChatRuntimeListener>();
  const snapshot: VoiceChatRuntimeSnapshot = {
    ...DEFAULT_SNAPSHOT,
    messages: [],
  };
  let publicSnapshot = createPublicSnapshot(snapshot);

  let assistantHistory: ConversationTurn[] = [];
  let lastSavedTurnCount = 0;
  let currentMessageIds: CurrentMessageIds = { user: null, ai: null };
  let chatMetadata: VoiceChatRuntimeStoreChatMetadata = {
    createdAt: null,
    lastActivityAt: null,
  };

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const refreshSnapshot = () => {
    publicSnapshot = createPublicSnapshot(snapshot);
  };

  return {
    clearChatState(nextChatId = null) {
      snapshot.chatId = nextChatId;
      snapshot.chatTitle = null;
      snapshot.messages = [];
      assistantHistory = [];
      lastSavedTurnCount = 0;
      currentMessageIds = { user: null, ai: null };
      chatMetadata = {
        createdAt: null,
        lastActivityAt: null,
      };
      refreshSnapshot();
      notify();
    },
    getAssistantHistory() {
      return assistantHistory.map((turn) => ({
        ...turn,
        parts: turn.parts.map((part) => ({ ...part })),
      }));
    },
    getChatMetadata() {
      return { ...chatMetadata };
    },
    getCurrentMessageIds() {
      return { ...currentMessageIds };
    },
    getLastSavedTurnCount() {
      return lastSavedTurnCount;
    },
    getSnapshot() {
      return publicSnapshot;
    },
    setAudioLevel(level) {
      snapshot.audioLevel = level;
      refreshSnapshot();
      notify();
    },
    setAssistantHistory(turns) {
      assistantHistory = turns.map((turn) => ({
        ...turn,
        parts: turn.parts.map((part) => ({ ...part })),
      }));
      notify();
    },
    setChatId(chatId) {
      snapshot.chatId = chatId;
      refreshSnapshot();
      notify();
    },
    setChatStateFromHistory(chatId, history) {
      snapshot.chatId = chatId;
      snapshot.chatTitle = history.title ?? null;
      snapshot.messages = projectTurnsToMessages(history.full_history);
      assistantHistory = history.assistant_history.map((turn) => ({
        ...turn,
        parts: turn.parts.map((part) => ({ ...part })),
      }));
      lastSavedTurnCount = history.full_history.length;
      currentMessageIds = { user: null, ai: null };
      chatMetadata = {
        createdAt: history.created_at ?? null,
        lastActivityAt: history.last_activity_at ?? null,
      };
      refreshSnapshot();
      notify();
    },
    setConnectionState(state) {
      snapshot.connectionState = state;
      refreshSnapshot();
      notify();
    },
    setCurrentMessageIds(ids) {
      currentMessageIds = {
        ...currentMessageIds,
        ...ids,
      };
      notify();
    },
    setError(error) {
      snapshot.error = error;
      refreshSnapshot();
      notify();
    },
    setLastSavedTurnCount(count) {
      lastSavedTurnCount = count;
      notify();
    },
    setListeningMode(mode) {
      snapshot.listeningMode = mode;
      refreshSnapshot();
      notify();
    },
    setMessages(messages) {
      snapshot.messages = cloneMessages(messages);
      refreshSnapshot();
      notify();
    },
    setMuted(isMuted) {
      snapshot.isMuted = isMuted;
      refreshSnapshot();
      notify();
    },
    setOutputAudioLevel(level) {
      snapshot.outputAudioLevel = level;
      refreshSnapshot();
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    updateChatMetadata(metadata) {
      if (metadata.title !== undefined) {
        snapshot.chatTitle = metadata.title ?? null;
        refreshSnapshot();
      }

      chatMetadata = {
        createdAt: metadata.createdAt ?? chatMetadata.createdAt,
        lastActivityAt: metadata.lastActivityAt ?? chatMetadata.lastActivityAt,
      };
      notify();
    },
  };
}
