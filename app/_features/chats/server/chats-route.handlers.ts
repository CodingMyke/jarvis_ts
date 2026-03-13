import { jsonError, jsonOk } from "@/app/_server/http/responses";
import { getZodErrorMessage } from "@/app/_server/http/zod";
import type { AuthContext } from "@/app/_server/http/auth";
import type { ConversationTurn } from "@/app/_features/assistant";
import {
  appendToChat,
  createChat,
  deleteChat,
  getChatById,
  getChats,
  searchChatsSemantic,
} from "./chats.service";
import type { ChatResponse } from "./chats.types";
import {
  chatsAppendBodySchema,
  chatsCreateBodySchema,
  chatsDeleteBodySchema,
  chatsQuerySchema,
} from "./chats-route.schemas";

function toChatResponse(row: {
  id: string;
  user_id: string;
  title: string | null;
  full_history: unknown;
  assistant_history: unknown;
  summary_text: string | null;
  last_activity_at: string;
  created_at: string;
}): ChatResponse {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    full_history: Array.isArray(row.full_history) ? (row.full_history as ConversationTurn[]) : [],
    assistant_history: Array.isArray(row.assistant_history) ? (row.assistant_history as ConversationTurn[]) : [],
    summary_text: row.summary_text,
    last_activity_at: row.last_activity_at,
    created_at: row.created_at,
  };
}

export function getChatsUnauthorizedResponse() {
  return jsonError(401, {
    error: "UNAUTHORIZED",
    message: "Utente non autenticato",
  });
}

export async function handleGetChats(auth: AuthContext, searchParams: URLSearchParams) {
  const parsed = chatsQuerySchema.safeParse({
    id: searchParams.get("id") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_QUERY",
      message: getZodErrorMessage(parsed.error),
    });
  }

  if (parsed.data.id) {
    const result = await getChatById(auth.supabase, auth.userId, parsed.data.id);
    if (!result.success) {
      const status = result.error === "Chat non trovata" ? 404 : 500;
      return jsonError(status, {
        error: result.error === "Chat non trovata" ? "NOT_FOUND" : "EXECUTION_ERROR",
        message: result.error,
      });
    }

    return jsonOk({
      success: true,
      chat: toChatResponse(result.chat),
    });
  }

  if (parsed.data.search) {
    const result = await searchChatsSemantic(
      auth.supabase,
      auth.userId,
      parsed.data.search,
      parsed.data.limit ?? 5,
    );

    if (!result.success) {
      return jsonError(500, {
        error: "EXECUTION_ERROR",
        message: result.error,
      });
    }

    return jsonOk({
      success: true,
      matches: result.matches,
      count: result.matches.length,
    });
  }

  const result = await getChats(auth.supabase, auth.userId);
  if (!result.success) {
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message: result.error,
    });
  }

  return jsonOk({
    success: true,
    chats: result.chats.map(toChatResponse),
    count: result.chats.length,
  });
}

export async function handleCreateChat(auth: AuthContext, body: unknown) {
  const parsed = chatsCreateBodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      message: getZodErrorMessage(parsed.error),
    });
  }

  const result = await createChat(auth.supabase, auth.userId, parsed.data);
  if (!result.success) {
    return jsonError(500, {
      error: "CREATION_FAILED",
      message: result.error,
    });
  }

  return jsonOk({
    success: true,
    chat: toChatResponse(result.chat),
  });
}

export async function handleAppendChat(auth: AuthContext, body: unknown) {
  const parsed = chatsAppendBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      message: getZodErrorMessage(parsed.error),
    });
  }

  const result = await appendToChat(auth.supabase, auth.userId, parsed.data);
  if (!result.success) {
    const status = result.error === "Chat non trovata" ? 404 : 500;
    return jsonError(status, {
      error: result.error === "Chat non trovata" ? "NOT_FOUND" : "UPDATE_FAILED",
      message: result.error,
    });
  }

  return jsonOk({
    success: true,
    chat: toChatResponse(result.chat),
  });
}

export async function handleDeleteChat(auth: AuthContext, input: unknown, searchParams: URLSearchParams) {
  const rawBody = typeof input === "object" && input !== null ? input : {};
  const parsed = chatsDeleteBodySchema.safeParse({
    ...rawBody,
    id: (
      typeof rawBody === "object"
      && rawBody !== null
      && "id" in rawBody
      && typeof rawBody.id === "string"
    ) ? rawBody.id : (searchParams.get("id") ?? undefined),
  });

  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      message: getZodErrorMessage(parsed.error),
    });
  }

  const result = await deleteChat(auth.supabase, auth.userId, parsed.data.id);
  if (!result.success) {
    const status = result.error === "Chat non trovata" ? 404 : 500;
    return jsonError(status, {
      error: result.error === "Chat non trovata" ? "NOT_FOUND" : "DELETE_FAILED",
      message: result.error,
    });
  }

  return jsonOk({
    success: true,
    deleted: true,
    id: parsed.data.id,
  });
}
