import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/app/lib/supabase/database.types";
import type { CreateSemanticMemoryRequest } from "./model";

type SemanticMemoryInsert = Database["public"]["Tables"]["semantic_memory"]["Insert"];
type SemanticMemoryRow = Database["public"]["Tables"]["semantic_memory"]["Row"];

export type CreateSemanticMemoryResult =
  | { success: true; memory: SemanticMemoryRow }
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
  const row: SemanticMemoryInsert = {
    user_id: userId,
    content,
    key: body.key ?? null,
    importance: body.importance ?? "medium",
    created_at: now,
    updated_at: now,
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
