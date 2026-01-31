import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/app/lib/supabase/database.types";
import type { ConversationTurn } from "@/app/lib/voice-chat/storage/types";
import { createSummaryTurn } from "@/app/lib/voice-chat/storage/summarizer";
import { SUMMARY_WINDOW_SIZE } from "@/app/lib/voice-chat/config/compaction.config";
import {
  generateSummaryFromTurns,
  generateChatSummaryForSearch,
  generateChatTitle,
} from "@/app/lib/llm";
import { embed } from "@/app/lib/embeddings";
import type { CreateChatRequest, AppendChatRequest, ChatSearchResult } from "./model";

type ChatsRow = Database["public"]["Tables"]["chats"]["Row"];
type ChatsInsert = Database["public"]["Tables"]["chats"]["Insert"];
type ChatsUpdate = Database["public"]["Tables"]["chats"]["Update"];

const EMBED_OPTIONS = { taskType: "RETRIEVAL_DOCUMENT" as const };
const EMBED_OPTIONS_QUERY = { taskType: "RETRIEVAL_QUERY" as const };

const EMBEDDING_REQUIRED_ERROR =
  "Impossibile generare l'embedding. Verificare la configurazione (es. GEMINI_API_KEY).";

function serializeTurns(turns: ConversationTurn[]): Json {
  return turns as unknown as Json;
}

function parseTurns(json: unknown): ConversationTurn[] {
  if (!Array.isArray(json)) return [];
  return json as ConversationTurn[];
}

export type CreateChatResult =
  | { success: true; chat: ChatsRow }
  | { success: false; error: string };

export type GetChatResult =
  | { success: true; chat: ChatsRow }
  | { success: false; error: string };

export type GetChatsResult =
  | { success: true; chats: ChatsRow[] }
  | { success: false; error: string };

export type AppendChatResult =
  | { success: true; chat: ChatsRow }
  | { success: false; error: string };

export type SearchChatsResult =
  | { success: true; matches: ChatSearchResult[] }
  | { success: false; error: string };

export type DeleteChatResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Crea una nuova chat. full_history e assistant_history uguali; summary vuoto.
 */
export async function createChat(
  supabase: SupabaseClient<Database>,
  userId: string,
  body: CreateChatRequest
): Promise<CreateChatResult> {
  const turns = Array.isArray(body.turns) ? body.turns : [];
  const now = new Date().toISOString();

  const row: ChatsInsert = {
    user_id: userId,
    title: body.title?.trim() || null,
    full_history: serializeTurns(turns),
    assistant_history: serializeTurns(turns),
    summary_text: null,
    summary_embedding: null,
    last_activity_at: now,
    created_at: now,
  };

  const { data, error } = await supabase
    .from("chats")
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error("[createChat]", error);
    return { success: false, error: error.message };
  }
  return { success: true, chat: data as ChatsRow };
}

/**
 * Legge una chat per id (solo se appartiene all'utente).
 */
export async function getChatById(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<GetChatResult> {
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[getChatById]", error);
    return { success: false, error: error.message };
  }
  if (!data) {
    return { success: false, error: "Chat non trovata" };
  }
  return { success: true, chat: data as ChatsRow };
}

/**
 * Lista le chat dell'utente (ordinate per last_activity_at desc).
 */
export async function getChats(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<GetChatsResult> {
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("user_id", userId)
    .order("last_activity_at", { ascending: false });

  if (error) {
    console.error("[getChats]", error);
    return { success: false, error: error.message };
  }
  return { success: true, chats: (data ?? []) as ChatsRow[] };
}

/**
 * Ricerca semantica tramite RPC search_chats_semantic.
 */
export async function searchChatsSemantic(
  supabase: SupabaseClient<Database>,
  userId: string,
  query: string,
  limit: number = 5
): Promise<SearchChatsResult> {
  const q = typeof query === "string" ? query.trim() : "";
  if (!q) {
    return { success: false, error: "La query di ricerca non può essere vuota" };
  }

  let queryEmbedding: string;
  try {
    const vector = await embed(q, EMBED_OPTIONS_QUERY);
    if (vector.length === 0) throw new Error(EMBEDDING_REQUIRED_ERROR);
    queryEmbedding = JSON.stringify(vector);
  } catch (err) {
    console.error("[searchChatsSemantic] embedding failed", err);
    return { success: false, error: EMBEDDING_REQUIRED_ERROR };
  }

  const { data, error } = await supabase.rpc("search_chats_semantic", {
    p_query_embedding: queryEmbedding,
    p_limit: limit,
  });

  if (error) {
    console.error("[searchChatsSemantic]", error);
    return { success: false, error: error.message };
  }

  const rows = (data ?? []) as {
    chat_id: string;
    title: string;
    summary_text: string;
    similarity: number;
    distance: number;
    last_activity_at: string;
  }[];

  const matches: ChatSearchResult[] = rows
    .filter((r) => r.chat_id)
    .map((r) => ({
      chat_id: r.chat_id,
      title: r.title ?? "",
      summary_text: r.summary_text ?? "",
      similarity: r.similarity,
      distance: r.distance,
      last_activity_at: r.last_activity_at,
    }));

  return { success: true, matches };
}

/**
 * Compattazione: assistant_history deve avere sempre <= SUMMARY_WINDOW_SIZE turni.
 * Se ce ne sono di più, si riassume la parte vecchia in un turno; il totale
 * (1 riassunto + ultimi SUMMARY_WINDOW_SIZE - 1 messaggi) è sempre <= 30.
 * Il riassunto serve solo a far capire all'assistente di cosa si parlava;
 * NON è il summary_text della colonna chat (quello è generato separatamente).
 */
async function runCompaction(
  assistantHistory: ConversationTurn[]
): Promise<ConversationTurn[]> {
  if (assistantHistory.length <= SUMMARY_WINDOW_SIZE) {
    return assistantHistory;
  }

  const keepCount = SUMMARY_WINDOW_SIZE - 1;
  const toCompact = assistantHistory.slice(0, assistantHistory.length - keepCount);
  const tail = assistantHistory.slice(-keepCount);

  const compactionSummary = await generateSummaryFromTurns(toCompact);
  const summaryTurn = createSummaryTurn(compactionSummary || "(Nessun riassunto)");
  return [summaryTurn, ...tail];
}

/**
 * Append turni a una chat; aggiorna last_activity_at; compatta se necessario.
 */
export async function appendToChat(
  supabase: SupabaseClient<Database>,
  userId: string,
  body: AppendChatRequest
): Promise<AppendChatResult> {
  const getResult = await getChatById(supabase, userId, body.id);
  if (!getResult.success) return getResult;

  const chat = getResult.chat;
  const fullHistory = parseTurns(chat.full_history);
  const assistantHistory = parseTurns(chat.assistant_history);

  const newTurns = Array.isArray(body.turns) ? body.turns : [];
  const updatedFull = [...fullHistory, ...newTurns];
  const updatedAssistant = [...assistantHistory, ...newTurns];

  const now = new Date().toISOString();

  let finalAssistant = updatedAssistant;

  if (updatedAssistant.length > SUMMARY_WINDOW_SIZE) {
    try {
      finalAssistant = await runCompaction(updatedAssistant);
    } catch (err) {
      console.error("[appendToChat] compaction failed", err);
    }
  }

  let summaryText: string | null = chat.summary_text;
  let summaryEmbedding: string | null = chat.summary_embedding;

  if (finalAssistant.length > 0 && (updatedAssistant.length > SUMMARY_WINDOW_SIZE || !summaryText)) {
    try {
      const chatLevelSummary = await generateChatSummaryForSearch(finalAssistant);
      if (chatLevelSummary.trim()) {
        summaryText = chatLevelSummary.trim().slice(0, 2000);
        const vector = await embed(chatLevelSummary.trim(), EMBED_OPTIONS);
        summaryEmbedding = vector.length > 0 ? JSON.stringify(vector) : null;
      }
    } catch (err) {
      console.error("[appendToChat] chat-level summary failed", err);
    }
  }

  const updates: ChatsUpdate = {
    full_history: serializeTurns(updatedFull),
    assistant_history: serializeTurns(finalAssistant),
    last_activity_at: now,
    summary_text: summaryText,
    summary_embedding: summaryEmbedding,
  };

  // Titolo solo al primo salvataggio quando c'è contenuto; poi cambia solo se lo chiede l'utente
  if (!chat.title && summaryText) {
    try {
      updates.title = await generateChatTitle(summaryText);
    } catch {
      updates.title = "Chat";
    }
  }

  const { data, error } = await supabase
    .from("chats")
    .update(updates)
    .eq("user_id", userId)
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    console.error("[appendToChat]", error);
    return { success: false, error: error.message };
  }
  return { success: true, chat: data as ChatsRow };
}

/**
 * Elimina una chat (solo se appartiene all'utente).
 */
export async function deleteChat(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<DeleteChatResult> {
  const { error } = await supabase
    .from("chats")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  if (error) {
    console.error("[deleteChat]", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
