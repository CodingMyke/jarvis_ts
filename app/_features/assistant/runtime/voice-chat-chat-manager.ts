import { ConversationStorage, type ConversationTurn } from "@/app/_features/assistant/lib/storage";
import type {
  PersistedChat,
  PersistedChatApiResponse,
  PersistedChatHistory,
  PersistedChatHistoryApiResponse,
} from "./adapters/chat-persistence.adapter";
import type { VoiceChatRuntimeStore } from "./voice-chat-runtime.store";

interface VoiceChatChatManagerDependencies {
  appendChatTurns(
    id: string,
    turns: ConversationTurn[],
  ): Promise<PersistedChatApiResponse | null>;
  createChat(turns: ConversationTurn[]): Promise<PersistedChatApiResponse | null>;
  deleteChatById(id: string): Promise<{ ok: boolean; message?: string }>;
  fetchChatById(id: string): Promise<PersistedChatHistoryApiResponse | null>;
  store: VoiceChatRuntimeStore;
}

export interface VoiceChatChatManager {
  createNewChat(): Promise<{ success: boolean; chatId?: string; error?: string }>;
  deleteChatById(id: string): Promise<{ success: boolean; error?: string }>;
  deleteCurrentChat(): Promise<{ success: boolean; error?: string }>;
  loadChat(chatId: string): Promise<ConversationTurn[]>;
  persistCurrentMessages(): Promise<void>;
  prepareChatSwitch(nextChatId: string): void;
}

function cloneTurns(turns: ConversationTurn[]): ConversationTurn[] {
  return turns.map((turn) => ({
    ...turn,
    parts: turn.parts.map((part) => ({ ...part })),
  }));
}

function applyPersistedChatMetadata(
  store: VoiceChatRuntimeStore,
  chat: PersistedChat | PersistedChatHistory | undefined,
): void {
  if (!chat) {
    return;
  }

  store.updateChatMetadata({
    title: chat.title ?? null,
    createdAt: chat.created_at ?? null,
    lastActivityAt: chat.last_activity_at ?? null,
  });
}

function getSavableMessagesForNewChat(
  messages: ReturnType<VoiceChatRuntimeStore["getSnapshot"]>["messages"],
) {
  const lastUserIndex = messages.findLastIndex((message) => message.isUser);
  if (lastUserIndex < 0) {
    return messages;
  }

  return messages.slice(0, lastUserIndex);
}

export function createVoiceChatChatManager(
  dependencies: VoiceChatChatManagerDependencies,
): VoiceChatChatManager {
  const storage = new ConversationStorage();

  const persistTurnsDelta = async (chatId: string, turns: ConversationTurn[]): Promise<void> => {
    const from = dependencies.store.getLastSavedTurnCount();
    const delta = turns.slice(from);

    if (delta.length === 0) {
      return;
    }

    const response = await dependencies.appendChatTurns(chatId, delta);
    if (!response?.chat) {
      return;
    }

    applyPersistedChatMetadata(dependencies.store, response?.chat);
    dependencies.store.setLastSavedTurnCount(turns.length);
  };

  return {
    async createNewChat() {
      const snapshot = dependencies.store.getSnapshot();
      const messagesToPersist = getSavableMessagesForNewChat(snapshot.messages);

      if (snapshot.chatId && messagesToPersist.length > 0) {
        await persistTurnsDelta(snapshot.chatId, storage.messagesToTurns(messagesToPersist));
      }

      const response = await dependencies.createChat([]);

      if (!response?.success || !response.chat?.id) {
        return {
          success: false,
          error: response?.message ?? "Unable to create a new chat",
        };
      }

      dependencies.store.clearChatState(response.chat.id);
      applyPersistedChatMetadata(dependencies.store, response.chat);

      return {
        success: true,
        chatId: response.chat.id,
      };
    },
    async deleteCurrentChat() {
      const { chatId } = dependencies.store.getSnapshot();

      if (!chatId) {
        dependencies.store.clearChatState();
        return { success: true };
      }

      const response = await dependencies.deleteChatById(chatId);
      if (!response.ok) {
        return {
          success: false,
          error: response.message ?? "Unable to delete the current chat",
        };
      }

      dependencies.store.clearChatState();
      return { success: true };
    },
    async deleteChatById(id) {
      const currentChatId = dependencies.store.getSnapshot().chatId;
      if (id === currentChatId) {
        return this.deleteCurrentChat();
      }

      const response = await dependencies.deleteChatById(id);
      if (!response.ok) {
        return {
          success: false,
          error: response.message ?? "Unable to delete the requested chat",
        };
      }

      return { success: true };
    },
    async loadChat(chatId) {
      const response = await dependencies.fetchChatById(chatId);
      if (!response?.success || !response.chat) {
        dependencies.store.clearChatState();
        return [];
      }

      dependencies.store.setChatStateFromHistory(chatId, response.chat);
      return cloneTurns(response.chat.assistant_history);
    },
    async persistCurrentMessages() {
      const snapshot = dependencies.store.getSnapshot();
      if (snapshot.messages.length === 0) {
        return;
      }

      const turns = storage.messagesToTurns(snapshot.messages);

      if (!snapshot.chatId) {
        const response = await dependencies.createChat(turns);
        if (!response?.success || !response.chat?.id) {
          return;
        }

        dependencies.store.setChatId(response.chat.id);
        applyPersistedChatMetadata(dependencies.store, response.chat);
        dependencies.store.setLastSavedTurnCount(turns.length);
        return;
      }

      await persistTurnsDelta(snapshot.chatId, turns);
    },
    prepareChatSwitch(nextChatId) {
      dependencies.store.clearChatState(nextChatId);
    },
  };
}
