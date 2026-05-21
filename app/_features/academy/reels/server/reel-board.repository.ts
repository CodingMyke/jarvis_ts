import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/app/_server/supabase/database.types";
import type { ReelInsert, ReelUpdate } from "../lib/reel-board.types";

type ReelSupabaseClient = SupabaseClient<Database>;
type TransitionEventInsert =
  Database["public"]["Tables"]["academy_reel_transition_events"]["Insert"];
type RejectedIdeaInsert = Database["public"]["Tables"]["academy_reel_rejected_ideas"]["Insert"];

export async function listReelsByUser(supabase: ReelSupabaseClient, userId: string) {
  return supabase
    .from("academy_reels")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
}

export async function getReelById(supabase: ReelSupabaseClient, userId: string, reelId: string) {
  return supabase
    .from("academy_reels")
    .select("*")
    .eq("user_id", userId)
    .eq("id", reelId)
    .maybeSingle();
}

export async function insertReel(
  supabase: ReelSupabaseClient,
  userId: string,
  input: Omit<ReelInsert, "user_id">,
) {
  return supabase
    .from("academy_reels")
    .insert({
      ...input,
      user_id: userId,
    })
    .select("*")
    .single();
}

export async function updateReelById(
  supabase: ReelSupabaseClient,
  userId: string,
  reelId: string,
  input: ReelUpdate,
) {
  return supabase
    .from("academy_reels")
    .update(input)
    .eq("user_id", userId)
    .eq("id", reelId)
    .select("*")
    .maybeSingle();
}

export async function deleteReelById(supabase: ReelSupabaseClient, userId: string, reelId: string) {
  return supabase
    .from("academy_reels")
    .delete()
    .eq("user_id", userId)
    .eq("id", reelId)
    .select("id")
    .maybeSingle();
}

export async function insertTransitionEvent(
  supabase: ReelSupabaseClient,
  input: TransitionEventInsert,
) {
  return supabase.from("academy_reel_transition_events").insert(input).select("id").single();
}

export async function saveRejectedIdeaSnapshot(
  supabase: ReelSupabaseClient,
  input: RejectedIdeaInsert,
) {
  return supabase.from("academy_reel_rejected_ideas").insert(input).select("id").single();
}
