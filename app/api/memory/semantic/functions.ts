import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/app/lib/supabase/database.types";
import type {
  CreateSemanticMemoryRequest,
  UpdateSemanticMemoryRequest,
} from "./model";
import { embed } from "@/app/lib/embeddings";

type SemanticMemoryInsert = Database["public"]["Tables"]["semantic_memory"]["Insert"];
type SemanticMemoryUpdate = Database["public"]["Tables"]["semantic_memory"]["Update"];
type SemanticMemoryRow = Database["public"]["Tables"]["semantic_memory"]["Row"];

const EMBED_OPTIONS = { taskType: "RETRIEVAL_DOCUMENT" as const };
const EMBED_OPTIONS_QUERY = { taskType: "RETRIEVAL_QUERY" as const };

const EMBEDDING_REQUIRED_ERROR =
  "Impossibile generare l'embedding. Verificare la configurazione del servizio (es. GEMINI_API_KEY).";

/** Genera l'embedding per il contenuto (obbligatorio per il salvataggio). */
async function embeddingForContent(content: string): Promise<string> {
  const vector = await embed(content, EMBED_OPTIONS);
  if (vector.length === 0) throw new Error(EMBEDDING_REQUIRED_ERROR);
  return JSON.stringify(vector);
}

export type CreateSemanticMemoryResult =
  | { success: true; memory: SemanticMemoryRow }
  | { success: false; error: string };

export type GetSemanticMemoriesResult =
  | { success: true; memories: SemanticMemoryRow[] }
  | { success: false; error: string };

export type GetSemanticMemoryResult =
  | { success: true; memory: SemanticMemoryRow }
  | { success: false; error: string };

export type UpdateSemanticMemoryResult =
  | { success: true; memory: SemanticMemoryRow }
  | { success: false; error: string };

export type DeleteSemanticMemoryResult =
  | { success: true }
  | { success: false; error: string };

export type SearchSemanticMemoriesResult =
  | { success: true; memories: { id: string; content: string; similarity: number }[] }
  | { success: false; error: string };

/** Soglia di similarità oltre la quale si aggiorna un record esistente invece di creare. */
const CREATE_OR_UPDATE_SIMILARITY_THRESHOLD = 0.85;

/**
 * Inserisce un record di memoria semantica per l'utente dato.
 * Se esiste già una memoria molto simile (per deduplicazione), aggiorna quella invece di creare.
 */
export async function createSemanticMemory(
  supabase: SupabaseClient<Database>,
  userId: string,
  body: CreateSemanticMemoryRequest
): Promise<CreateSemanticMemoryResult> {
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    return { success: false, error: "Il contenuto non può essere vuoto" };
  }

  const searchResult = await searchSemanticMemoriesByContent(supabase, userId, content, 1);
  if (
    searchResult.success &&
    searchResult.memories.length > 0 &&
    searchResult.memories[0].similarity >= CREATE_OR_UPDATE_SIMILARITY_THRESHOLD
  ) {
    const existing = searchResult.memories[0];
    const mergedContent = [existing.content, content].filter(Boolean).join("\n\n");
    const updateResult = await updateSemanticMemory(supabase, userId, existing.id, {
      content: mergedContent,
      key: body.key,
      importance: body.importance,
    });
    if (!updateResult.success) return { success: false, error: updateResult.error };
    return { success: true, memory: updateResult.memory };
  }

  let embedding: string;
  try {
    embedding = await embeddingForContent(content);
  } catch (err) {
    console.error("[createSemanticMemory] embedding failed", err);
    return { success: false, error: EMBEDDING_REQUIRED_ERROR };
  }

  const now = new Date().toISOString();
  const row: SemanticMemoryInsert = {
    user_id: userId,
    content,
    key: body.key ?? null,
    importance: body.importance ?? "medium",
    created_at: now,
    updated_at: now,
    embedding,
  };

  const { data, error } = await supabase
    .from("semantic_memory")
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error("[createSemanticMemory]", error);
    return { success: false, error: error.message };
  }

  return { success: true, memory: data as SemanticMemoryRow };
}

/**
 * Legge tutti i record di memoria semantica dell'utente.
 */
export async function getSemanticMemories(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<GetSemanticMemoriesResult> {
  const { data, error } = await supabase
    .from("semantic_memory")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[getSemanticMemories]", error);
    return { success: false, error: error.message };
  }
  return { success: true, memories: (data ?? []) as SemanticMemoryRow[] };
}

/**
 * Legge un singolo record per id (solo se appartiene all'utente).
 */
export async function getSemanticMemoryById(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<GetSemanticMemoryResult> {
  const { data, error } = await supabase
    .from("semantic_memory")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[getSemanticMemoryById]", error);
    return { success: false, error: error.message };
  }
  if (!data) {
    return { success: false, error: "Record non trovato" };
  }
  return { success: true, memory: data as SemanticMemoryRow };
}

/**
 * Aggiorna un record di memoria semantica (solo se appartiene all'utente).
 */
export async function updateSemanticMemory(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
  body: Omit<UpdateSemanticMemoryRequest, "id">
): Promise<UpdateSemanticMemoryResult> {
  const updates: SemanticMemoryUpdate = { updated_at: new Date().toISOString() };
  if (body.content !== undefined) {
    const content = String(body.content).trim();
    if (!content) return { success: false, error: "Il contenuto non può essere vuoto" };
    try {
      updates.content = content;
      updates.embedding = await embeddingForContent(content);
    } catch (err) {
      console.error("[updateSemanticMemory] embedding failed", err);
      return { success: false, error: EMBEDDING_REQUIRED_ERROR };
    }
  }
  if (body.key !== undefined) updates.key = body.key;
  if (body.importance !== undefined) updates.importance = body.importance;

  const { data, error } = await supabase
    .from("semantic_memory")
    .update(updates)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    console.error("[updateSemanticMemory]", error);
    return { success: false, error: error.message };
  }
  if (!data) {
    return { success: false, error: "Record non trovato" };
  }
  return { success: true, memory: data as SemanticMemoryRow };
}

/**
 * Elimina un record di memoria semantica (solo se appartiene all'utente).
 */
export async function deleteSemanticMemory(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<DeleteSemanticMemoryResult> {
  const { error } = await supabase
    .from("semantic_memory")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  if (error) {
    console.error("[deleteSemanticMemory]", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Ricerca semantica nelle memorie semantiche tramite RPC match_semantic_memory.
 * Richiede query testuale; opzionale match_count (default 5).
 */
export async function searchSemanticMemoriesByContent(
  supabase: SupabaseClient<Database>,
  _userId: string,
  query: string,
  matchCount: number = 5
): Promise<SearchSemanticMemoriesResult> {
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
    console.error("[searchSemanticMemoriesByContent] embedding failed", err);
    return { success: false, error: EMBEDDING_REQUIRED_ERROR };
  }

  const { data, error } = await supabase.rpc("match_semantic_memory", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
  });

  if (error) {
    console.error("[searchSemanticMemoriesByContent]", error);
    return { success: false, error: error.message };
  }

  const memories = (data ?? []).map((row: { id: string; content: string; similarity: number }) => ({
    id: row.id,
    content: row.content,
    similarity: row.similarity,
  }));
  return { success: true, memories };
}
