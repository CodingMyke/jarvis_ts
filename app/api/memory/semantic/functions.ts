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

/** Genera l'embedding per il contenuto e lo restituisce come stringa JSON, o null se fallisce. */
async function embeddingForContent(content: string): Promise<string | null> {
  try {
    const vector = await embed(content, { taskType: "RETRIEVAL_DOCUMENT" });
    return vector.length > 0 ? JSON.stringify(vector) : null;
  } catch (err) {
    console.error("[embeddingForContent semantic]", err);
    return null;
  }
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

/**
 * Inserisce un record di memoria semantica per l'utente dato.
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

  const now = new Date().toISOString();
  const embedding = await embeddingForContent(content);
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
    updates.content = content;
    updates.embedding = await embeddingForContent(content);
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
