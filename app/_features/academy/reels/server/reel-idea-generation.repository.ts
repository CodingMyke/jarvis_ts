import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/app/_server/supabase/database.types";

type ReelSupabaseClient = SupabaseClient<Database>;
type AutomationRunInsert =
  Database["public"]["Tables"]["academy_reel_automation_runs"]["Insert"];
type AutomationRunUpdate =
  Database["public"]["Tables"]["academy_reel_automation_runs"]["Update"];
type ReelInsert = Database["public"]["Tables"]["academy_reels"]["Insert"];

export async function hasActiveFlowRun(
  supabase: ReelSupabaseClient,
  input: { userId: string; flow: "reel_idea_generation" | "reel_scripting" },
): Promise<boolean> {
  const { data, error } = await supabase
    .from("academy_reel_automation_runs")
    .select("id")
    .eq("user_id", input.userId)
    .eq("flow", input.flow)
    .in("status", ["queued", "processing"])
    .limit(1);

  if (error) {
    throw error;
  }

  return (data?.length ?? 0) > 0;
}

export async function insertAutomationRun(
  supabase: ReelSupabaseClient,
  input: AutomationRunInsert,
) {
  return supabase.from("academy_reel_automation_runs").insert(input).select("*").single();
}

export async function updateAutomationRun(
  supabase: ReelSupabaseClient,
  runId: string,
  input: AutomationRunUpdate,
) {
  return supabase
    .from("academy_reel_automation_runs")
    .update(input)
    .eq("id", runId)
    .select("*")
    .single();
}

export async function countPendingAiIdeas(supabase: ReelSupabaseClient, userId: string) {
  return supabase
    .from("academy_reels")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "ai_idea");
}

export async function listLatestPublishedReels(
  supabase: ReelSupabaseClient,
  userId: string,
  limit: number,
) {
  return supabase
    .from("academy_reels")
    .select("idea, title, caption, body, hashtags, notes, published_at, origin")
    .eq("user_id", userId)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
}

export async function listRecentSemanticMemories(
  supabase: ReelSupabaseClient,
  userId: string,
  limit: number,
) {
  return supabase
    .from("semantic_memory")
    .select("id, content, created_at, updated_at, key, importance")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);
}

export async function listRecentEpisodicMemories(
  supabase: ReelSupabaseClient,
  userId: string,
  limit: number,
) {
  return supabase
    .from("episodic_memory")
    .select("id, content, created_at, importance, metadata")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function listRecentRejectedIdeas(
  supabase: ReelSupabaseClient,
  userId: string,
  limit: number,
) {
  return supabase
    .from("academy_reel_rejected_ideas")
    .select("idea, title, caption, body, hashtags, notes, rejected_at, origin")
    .eq("user_id", userId)
    .order("rejected_at", { ascending: false })
    .limit(limit);
}

export async function insertGeneratedAiIdeas(
  supabase: ReelSupabaseClient,
  input: ReelInsert[],
) {
  if (input.length === 0) {
    return { data: [], error: null };
  }

  return supabase.from("academy_reels").insert(input).select("*");
}
