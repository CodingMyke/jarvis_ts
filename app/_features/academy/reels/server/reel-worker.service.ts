import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/app/_server/supabase/database.types";
import { generateReelField, generateReelFields } from "./reel-generation.service";
import { insertRunLog, listPendingJobs } from "./reel-generation.repository";

type ReelSupabaseClient = SupabaseClient<Database>;

type TriggerSource = "manual_global" | "manual_field" | "scheduled";

interface QueueJobLike {
  id: string;
  reel_id: string;
  run_at: string;
  trigger_source?: TriggerSource;
  target_field?: "title" | "caption" | "body" | "hashtags" | null;
}

interface WorkerDeps {
  listJobs: (supabase: ReelSupabaseClient, userId: string, nowIso: string) => Promise<QueueJobLike[]>;
  updateJob: (
    supabase: ReelSupabaseClient,
    jobId: string,
    patch: Database["public"]["Tables"]["academy_reel_generation_queue_jobs"]["Update"],
  ) => Promise<{ error: { message: string } | null }>;
  generateGlobal: (
    supabase: ReelSupabaseClient,
    userId: string,
    reelId: string,
  ) => Promise<{ success: boolean; message?: string }>;
  generateField: (
    supabase: ReelSupabaseClient,
    userId: string,
    reelId: string,
    field: "title" | "caption" | "body" | "hashtags",
  ) => Promise<{ success: boolean; message?: string }>;
  insertLog: (
    supabase: ReelSupabaseClient,
    userId: string,
    input: {
      status: "started" | "completed" | "failed";
      metadata: Database["public"]["Tables"]["academy_reel_generation_run_logs"]["Row"]["metadata"];
      reelId?: string | null;
      jobId?: string | null;
      errorMessage?: string | null;
    },
  ) => Promise<void>;
  now: () => Date;
}

const defaultDeps: WorkerDeps = {
  async listJobs(supabase, userId, nowIso) {
    const { data } = await listPendingJobs(supabase, userId, { now: nowIso, limit: 100 });
    return ((data ?? []) as QueueJobLike[]);
  },
  async updateJob(supabase, jobId, patch) {
    const { error } = await supabase
      .from("academy_reel_generation_queue_jobs")
      .update(patch)
      .eq("id", jobId);
    return { error };
  },
  generateGlobal: generateReelFields,
  generateField: generateReelField,
  async insertLog(supabase, userId, input) {
    await insertRunLog(supabase, userId, input);
  },
  now: () => new Date(),
};

function getPriority(source: TriggerSource | undefined): number {
  if (source === "manual_global" || source === "manual_field") {
    return 0;
  }
  return 1;
}

export function pickNextReelGenerationJob(jobs: QueueJobLike[]): QueueJobLike | null {
  if (jobs.length === 0) {
    return null;
  }

  return [...jobs].sort((left, right) => {
    const priorityDelta = getPriority(left.trigger_source) - getPriority(right.trigger_source);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return left.run_at.localeCompare(right.run_at);
  })[0];
}

export async function processNextReelGenerationJob(
  supabase: ReelSupabaseClient,
  userId: string,
  deps: WorkerDeps = defaultDeps,
): Promise<{ processed: boolean; error?: string }> {
  const nowIso = deps.now().toISOString();
  const jobs = await deps.listJobs(supabase, userId, nowIso);
  const nextJob = pickNextReelGenerationJob(jobs);

  if (!nextJob) {
    return { processed: false };
  }

  const claimed = await deps.updateJob(supabase, nextJob.id, {
    status: "processing",
    started_at: nowIso,
    updated_at: nowIso,
  });
  if (claimed.error) {
    return { processed: false, error: claimed.error.message };
  }

  await deps.insertLog(supabase, userId, {
    status: "started",
    reelId: nextJob.reel_id,
    jobId: nextJob.id,
    metadata: {
      triggerSource: nextJob.trigger_source ?? "scheduled",
      targetField: nextJob.target_field ?? null,
    },
  });

  const result = nextJob.target_field
    ? await deps.generateField(supabase, userId, nextJob.reel_id, nextJob.target_field)
    : await deps.generateGlobal(supabase, userId, nextJob.reel_id);

  const doneAt = deps.now().toISOString();
  const status = result.success ? "completed" : "failed";
  const update = await deps.updateJob(supabase, nextJob.id, {
    status,
    completed_at: doneAt,
    error_message: result.success ? null : (result.message ?? "Generation failed"),
    updated_at: doneAt,
  });
  if (update.error) {
    return { processed: false, error: update.error.message };
  }

  await deps.insertLog(supabase, userId, {
    status,
    reelId: nextJob.reel_id,
    jobId: nextJob.id,
    metadata: {
      triggerSource: nextJob.trigger_source ?? "scheduled",
      targetField: nextJob.target_field ?? null,
    },
    errorMessage: result.success ? null : (result.message ?? "Generation failed"),
  });

  return { processed: true };
}
