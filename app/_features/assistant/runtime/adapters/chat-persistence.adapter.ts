import type { ConversationTurn } from "../../lib/storage";

export interface PersistedChat {
  id: string;
  title?: string | null;
  created_at?: string;
  last_activity_at?: string;
}

export interface PersistedChatHistory {
  full_history: ConversationTurn[];
  assistant_history: ConversationTurn[];
  title?: string | null;
  created_at?: string;
  last_activity_at?: string;
}

export interface PersistedChatApiResponse {
  success?: boolean;
  message?: string;
  chat?: PersistedChat;
}

export interface PersistedChatHistoryApiResponse {
  success: boolean;
  message?: string;
  chat?: PersistedChatHistory;
}

export interface ChatPersistenceAdapter {
  appendChatTurns(
    id: string,
    turns: ConversationTurn[],
  ): Promise<PersistedChatApiResponse | null>;
  createChat(turns: ConversationTurn[]): Promise<PersistedChatApiResponse | null>;
  fetchChatById(id: string): Promise<PersistedChatHistoryApiResponse | null>;
  deleteChatById(id: string): Promise<{ ok: boolean; message?: string }>;
}

type FetchImplementation = typeof fetch;

export function createChatPersistenceAdapter(
  fetchImplementation: FetchImplementation = fetch,
): ChatPersistenceAdapter {
  return {
    async appendChatTurns(id, turns) {
      try {
        const response = await fetchImplementation("/api/chats", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, turns }),
          credentials: "same-origin",
        });

        if (!response.ok) {
          return null;
        }

        return (await response.json()) as PersistedChatApiResponse;
      } catch {
        return null;
      }
    },
    async createChat(turns) {
      try {
        const response = await fetchImplementation("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ turns }),
          credentials: "same-origin",
        });

        if (!response.ok) {
          return null;
        }

        return (await response.json()) as PersistedChatApiResponse;
      } catch {
        return null;
      }
    },
    async fetchChatById(id) {
      try {
        const response = await fetchImplementation(`/api/chats?id=${encodeURIComponent(id)}`, {
          credentials: "same-origin",
        });

        if (!response.ok) {
          return null;
        }

        return (await response.json()) as PersistedChatHistoryApiResponse;
      } catch {
        return null;
      }
    },
    async deleteChatById(id) {
      try {
        const response = await fetchImplementation(`/api/chats?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
          credentials: "same-origin",
        });

        if (response.ok) {
          return { ok: true };
        }

        const body = (await response.json().catch(() => ({}))) as { message?: string };
        return { ok: false, message: body.message ?? "Eliminazione fallita" };
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : "Eliminazione fallita",
        };
      }
    },
  };
}

export async function appendChatTurns(
  id: string,
  turns: ConversationTurn[],
): Promise<PersistedChatApiResponse | null> {
  return createChatPersistenceAdapter().appendChatTurns(id, turns);
}

export async function createChat(
  turns: ConversationTurn[],
): Promise<PersistedChatApiResponse | null> {
  return createChatPersistenceAdapter().createChat(turns);
}

export async function fetchChatById(
  id: string,
): Promise<PersistedChatHistoryApiResponse | null> {
  return createChatPersistenceAdapter().fetchChatById(id);
}

export async function deleteChatById(id: string): Promise<{ ok: boolean; message?: string }> {
  return createChatPersistenceAdapter().deleteChatById(id);
}
