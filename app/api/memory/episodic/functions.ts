import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/app/lib/supabase/database.types";
import type { CreateEpisodicMemoryRequest } from "./model";

type EpisodicMemoryInsert = Database["public"]["Tables"]["episodic_memory"]["Insert"];
type EpisodicMemoryRow = Database["public"]["Tables"]["episodic_memory"]["Row"];

export type CreateEpisodicMemoryResult =
  | { success: true; memory: EpisodicMemoryRow }
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

  const row: EpisodicMemoryInsert = {
    user_id: userId,
    content,
    importance: body.importance ?? "medium",
    metadata: body.metadata ?? {},
    ttl_days: body.ttl_days ?? null,
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
