import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/app/lib/supabase/database.types";
import type {
  CreateEpisodicMemoryRequest,
  UpdateEpisodicMemoryRequest,
} from "./model";
import { embed } from "@/app/lib/embeddings";

type EpisodicMemoryInsert = Database["public"]["Tables"]["episodic_memory"]["Insert"];
type EpisodicMemoryUpdate = Database["public"]["Tables"]["episodic_memory"]["Update"];
type EpisodicMemoryRow = Database["public"]["Tables"]["episodic_memory"]["Row"];

const EMBED_OPTIONS = { taskType: "RETRIEVAL_DOCUMENT" as const };

const EMBEDDING_REQUIRED_ERROR =
  "Impossibile generare l'embedding. Verificare la configurazione del servizio (es. GEMINI_API_KEY).";

/** Genera l'embedding per il contenuto (obbligatorio per il salvataggio). */
async function embeddingForContent(content: string): Promise<string> {
  const vector = await embed(content, EMBED_OPTIONS);
  if (vector.length === 0) throw new Error(EMBEDDING_REQUIRED_ERROR);
  return JSON.stringify(vector);
}

export type CreateEpisodicMemoryResult =
  | { success: true; memory: EpisodicMemoryRow }
  | { success: false; error: string };

export type GetEpisodicMemoriesResult =
  | { success: true; memories: EpisodicMemoryRow[] }
  | { success: false; error: string };

export type GetEpisodicMemoryResult =
  | { success: true; memory: EpisodicMemoryRow }
  | { success: false; error: string };

export type UpdateEpisodicMemoryResult =
  | { success: true; memory: EpisodicMemoryRow }
  | { success: false; error: string };

export type DeleteEpisodicMemoryResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Inserisce un record di memoria episodica per l'utente dato.
 */
export async function createEpisodicMemory(
  supabase: SupabaseClient<Database>,
  userId: string,
  body: CreateEpisodicMemoryRequest
): Promise<CreateEpisodicMemoryResult> {
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    return { success: false, error: "Il contenuto non può essere vuoto" };
  }

  let embedding: string;
  try {
    embedding = await embeddingForContent(content);
  } catch (err) {
    console.error("[createEpisodicMemory] embedding failed", err);
    return { success: false, error: EMBEDDING_REQUIRED_ERROR };
  }

  const row: EpisodicMemoryInsert = {
    user_id: userId,
    content,
    importance: body.importance ?? "medium",
    metadata: body.metadata ?? {},
    ttl_days: body.ttl_days ?? null,
    embedding,
  };

  const { data, error } = await supabase
    .from("episodic_memory")
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error("[createEpisodicMemory]", error);
    return { success: false, error: error.message };
  }

  return { success: true, memory: data as EpisodicMemoryRow };
}

/**
 * Legge tutti i record di memoria episodica dell'utente.
 */
export async function getEpisodicMemories(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<GetEpisodicMemoriesResult> {
  const { data, error } = await supabase
    .from("episodic_memory")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getEpisodicMemories]", error);
    return { success: false, error: error.message };
  }
  return { success: true, memories: (data ?? []) as EpisodicMemoryRow[] };
}

/**
 * Legge un singolo record per id (solo se appartiene all'utente).
 */
export async function getEpisodicMemoryById(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<GetEpisodicMemoryResult> {
  const { data, error } = await supabase
    .from("episodic_memory")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[getEpisodicMemoryById]", error);
    return { success: false, error: error.message };
  }
  if (!data) {
    return { success: false, error: "Record non trovato" };
  }
  return { success: true, memory: data as EpisodicMemoryRow };
}

/**
 * Aggiorna un record di memoria episodica (solo se appartiene all'utente).
 */
export async function updateEpisodicMemory(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
  body: Omit<UpdateEpisodicMemoryRequest, "id">
): Promise<UpdateEpisodicMemoryResult> {
  const updates: EpisodicMemoryUpdate = {};
  if (body.content !== undefined) {
    const content = String(body.content).trim();
    if (!content) return { success: false, error: "Il contenuto non può essere vuoto" };
    try {
      updates.content = content;
      updates.embedding = await embeddingForContent(content);
    } catch (err) {
      console.error("[updateEpisodicMemory] embedding failed", err);
      return { success: false, error: EMBEDDING_REQUIRED_ERROR };
    }
  }
  if (body.importance !== undefined) updates.importance = body.importance;
  if (body.metadata !== undefined) updates.metadata = body.metadata;
  if (body.ttl_days !== undefined) updates.ttl_days = body.ttl_days;

  if (Object.keys(updates).length === 0) {
    return { success: false, error: "Nessun campo da aggiornare" };
  }

  const { data, error } = await supabase
    .from("episodic_memory")
    .update(updates)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    console.error("[updateEpisodicMemory]", error);
    return { success: false, error: error.message };
  }
  if (!data) {
    return { success: false, error: "Record non trovato" };
  }
  return { success: true, memory: data as EpisodicMemoryRow };
}

/**
 * Elimina un record di memoria episodica (solo se appartiene all'utente).
 */
export async function deleteEpisodicMemory(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<DeleteEpisodicMemoryResult> {
  const { error } = await supabase
    .from("episodic_memory")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  if (error) {
    console.error("[deleteEpisodicMemory]", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
