import type { ConversationTurn } from "./storage";

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

export async function appendChatTurns(
  id: string,
  turns: ConversationTurn[]
): Promise<PersistedChatApiResponse | null> {
  const response = await fetch("/api/chats", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, turns }),
    credentials: "same-origin",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as PersistedChatApiResponse;
}

export async function createChat(
  turns: ConversationTurn[]
): Promise<PersistedChatApiResponse | null> {
  const response = await fetch("/api/chats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ turns }),
    credentials: "same-origin",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as PersistedChatApiResponse;
}

export async function fetchChatById(
  id: string
): Promise<PersistedChatHistoryApiResponse | null> {
  const response = await fetch(`/api/chats?id=${encodeURIComponent(id)}`, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as PersistedChatHistoryApiResponse;
}

export async function deleteChatById(id: string): Promise<{ ok: boolean; message?: string }> {
  const response = await fetch(`/api/chats?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "same-origin",
  });

  if (response.ok) {
    return { ok: true };
  }

  const body = (await response.json().catch(() => ({}))) as { message?: string };
  return { ok: false, message: body.message ?? "Eliminazione fallita" };
}
