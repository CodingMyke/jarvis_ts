/**
 * Modelli per l'API chats.
 */

import type { ConversationTurn } from "@/app/lib/voice-chat/storage/types";

/** Payload per creare una chat (POST body). */
export interface CreateChatRequest {
  /** Titolo opzionale (altrimenti generato dopo compattazione). */
  title?: string | null;
  /** Messaggi iniziali (full_history e assistant_history uguali). */
  turns?: ConversationTurn[];
}

/** Payload per append messaggi (PATCH body). */
export interface AppendChatRequest {
  /** ID chat. */
  id: string;
  /** Turni da appendere a full_history e assistant_history. */
  turns: ConversationTurn[];
}

/** Chat restituita dall'API (senza embedding). */
export interface ChatResponse {
  id: string;
  user_id: string;
  title: string | null;
  full_history: ConversationTurn[];
  assistant_history: ConversationTurn[];
  summary_text: string | null;
  last_activity_at: string;
  created_at: string;
}

/** Risultato ricerca semantica (RPC search_chats_semantic). */
export interface ChatSearchResult {
  chat_id: string;
  title: string;
  summary_text: string;
  similarity: number;
  distance: number;
  last_activity_at: string;
}
