import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/app/_server/supabase/database.types";
import type { ReelAutomationSettings } from "../lib/reel-generation.types";

type ReelSupabaseClient = SupabaseClient<Database>;

export async function getGenerationSettingsByUser(supabase: ReelSupabaseClient, userId: string) {
  return supabase
    .from("academy_reel_generation_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
}

export async function upsertGenerationSettings(
  supabase: ReelSupabaseClient,
  userId: string,
  settings: ReelAutomationSettings,
) {
  return supabase
    .from("academy_reel_generation_settings")
    .upsert(
      {
        user_id: userId,
        config: settings as unknown as Database["public"]["Tables"]["academy_reel_generation_settings"]["Row"]["config"],
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();
}

export async function listPendingJobs(
  supabase: ReelSupabaseClient,
  userId: string,
  options: { now: string; limit: number },
) {
  return supabase
    .from("academy_reel_generation_queue_jobs")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "queued")
    .lte("run_at", options.now)
    .order("run_at", { ascending: true })
    .limit(options.limit);
}

export async function insertManualGenerationJob(
  supabase: ReelSupabaseClient,
  userId: string,
  input: { reelId: string; runAt: string },
) {
  return supabase
    .from("academy_reel_generation_queue_jobs")
    .insert({
      user_id: userId,
      reel_id: input.reelId,
      status: "queued",
      run_at: input.runAt,
    })
    .select("*")
    .single();
}

export async function insertRunLog(
  supabase: ReelSupabaseClient,
  userId: string,
  input: {
    status: "started" | "completed" | "failed";
    metadata: Database["public"]["Tables"]["academy_reel_generation_run_logs"]["Row"]["metadata"];
    reelId?: string | null;
    jobId?: string | null;
    errorMessage?: string | null;
  },
) {
  return supabase
    .from("academy_reel_generation_run_logs")
    .insert({
      user_id: userId,
      status: input.status,
      metadata: input.metadata,
      reel_id: input.reelId ?? null,
      job_id: input.jobId ?? null,
      error_message: input.errorMessage ?? null,
    })
    .select("*")
    .single();
}
