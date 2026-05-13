import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/app/_server/supabase/database.types";
import {
  generateReelField,
  generateReelFields,
} from "./reel-generation.service";
import {
  countJobsByUserAndRunAt,
  insertRunLog,
  insertScheduledGenerationJobs,
  listActiveQueueReelIdsByUser,
  listGenerationSettingsRows,
  listIdeaReelIdsByUser,
  listPendingJobs,
} from "./reel-generation.repository";
import { reelAutomationSettingsSchema } from "../lib/reel-generation.schemas";

type ReelSupabaseClient = SupabaseClient<Database>;

type TriggerSource = "manual_global" | "manual_field" | "scheduled";

interface QueueJobLike {
  id: string;
  user_id: string;
  reel_id: string;
  run_at: string;
  trigger_source?: TriggerSource;
  target_field?: "title" | "caption" | "body" | "hashtags" | null;
}

interface GenerationSettingsRowLike {
  user_id: string;
  config: unknown;
}

interface WorkerDeps {
  listJobs: (
    supabase: ReelSupabaseClient,
    nowIso: string,
  ) => Promise<QueueJobLike[]>;
  listSettings: (
    supabase: ReelSupabaseClient,
  ) => Promise<GenerationSettingsRowLike[]>;
  listIdeaReelIds: (
    supabase: ReelSupabaseClient,
    userId: string,
  ) => Promise<string[]>;
  listActiveQueueReelIds: (
    supabase: ReelSupabaseClient,
    userId: string,
  ) => Promise<string[]>;
  hasJobForSlot: (
    supabase: ReelSupabaseClient,
    userId: string,
    runAtIso: string,
  ) => Promise<boolean>;
  insertScheduledJobs: (
    supabase: ReelSupabaseClient,
    jobs: Array<{ userId: string; reelId: string; runAt: string }>,
  ) => Promise<void>;
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
  async listJobs(supabase, nowIso) {
    const { data } = await listPendingJobs(supabase, {
      now: nowIso,
      limit: 100,
    });
    return (data ?? []) as QueueJobLike[];
  },
  async listSettings(supabase) {
    const { data } = await listGenerationSettingsRows(supabase);
    return (data ?? []) as GenerationSettingsRowLike[];
  },
  async listIdeaReelIds(supabase, userId) {
    const { data } = await listIdeaReelIdsByUser(supabase, userId);
    return (data ?? []).map((row) => row.id);
  },
  async listActiveQueueReelIds(supabase, userId) {
    const { data } = await listActiveQueueReelIdsByUser(supabase, userId);
    return (data ?? []).map((row) => row.reel_id);
  },
  async hasJobForSlot(supabase, userId, runAtIso) {
    const { count } = await countJobsByUserAndRunAt(supabase, userId, runAtIso);
    return (count ?? 0) > 0;
  },
  async insertScheduledJobs(supabase, jobs) {
    await insertScheduledGenerationJobs(supabase, jobs);
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

function toSettings(config: unknown): { enabled: boolean; runTimes: string[] } {
  const parsed = reelAutomationSettingsSchema.safeParse(config ?? {});
  if (!parsed.success) {
    return { enabled: false, runTimes: [] };
  }
  return {
    enabled: parsed.data.enabled,
    runTimes: parsed.data.runTimes,
  };
}

function toSlotIso(now: Date, runTime: string): string | null {
  const [hourRaw, minuteRaw] = runTime.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return null;
  }

  const slot = new Date(now);
  slot.setUTCSeconds(0, 0);
  slot.setUTCHours(hour, minute, 0, 0);
  return slot.toISOString();
}

function isDueForRunTime(now: Date, runTime: string): boolean {
  const [hourRaw, minuteRaw] = runTime.split(":");
  const scheduledHour = Number(hourRaw);
  const scheduledMinute = Number(minuteRaw);
  if (!Number.isInteger(scheduledHour) || !Number.isInteger(scheduledMinute)) {
    return false;
  }

  const nowHour = now.getUTCHours();
  const nowMinute = now.getUTCMinutes();

  return nowHour === scheduledHour && nowMinute === scheduledMinute;
}

export async function enqueueScheduledIdeaReels(
  supabase: ReelSupabaseClient,
  deps: WorkerDeps = defaultDeps,
): Promise<number> {
  const now = deps.now();
  console.log("[reels-worker] scheduling scan started", {
    now: now.toISOString(),
  });
  const settingsRows = await deps.listSettings(supabase);
  console.log("A [reels-worker] scheduling settings loaded", {
    users: settingsRows.length,
  });
  let totalEnqueued = 0;

  for (const row of settingsRows) {
    const settings = toSettings(row.config);
    if (!settings.enabled) {
      console.log("[reels-worker] skipping disabled user", {
        config: row.config,
      });

      continue;
    }

    const dueRunTimes = settings.runTimes.filter((runTime) =>
      isDueForRunTime(now, runTime),
    );

    console.log("[reels-worker] user with no due run times", {
      config: row.config,
    });

    if (dueRunTimes.length === 0) {
      continue;
    }
    console.log("[reels-worker] user has due run times", {
      userId: row.user_id,
      dueRunTimes,
    });

    const ideaReelIds = await deps.listIdeaReelIds(supabase, row.user_id);
    console.log("[reels-worker] idea reels fetched", {
      userId: row.user_id,
      ideaCount: ideaReelIds.length,
      ideaReelIds,
    });

    if (ideaReelIds.length === 0) {
      console.log("[reels-worker] no idea reels to enqueue", {
        userId: row.user_id,
      });
      continue;
    }

    const activeQueueReelIds = new Set(
      await deps.listActiveQueueReelIds(supabase, row.user_id),
    );
    console.log("[reels-worker] candidate reels loaded", {
      userId: row.user_id,
      ideaCount: ideaReelIds.length,
      activeQueueCount: activeQueueReelIds.size,
    });

    for (const runTime of dueRunTimes) {
      const runAtIso = toSlotIso(now, runTime);
      if (!runAtIso) {
        continue;
      }

      const hasExistingSlot = await deps.hasJobForSlot(
        supabase,
        row.user_id,
        runAtIso,
      );
      if (hasExistingSlot) {
        console.log("[reels-worker] slot already scheduled, skipping enqueue", {
          userId: row.user_id,
          runAt: runAtIso,
        });
        continue;
      }

      const jobsToInsert = ideaReelIds
        .filter((reelId) => !activeQueueReelIds.has(reelId))
        .map((reelId) => ({ userId: row.user_id, reelId, runAt: runAtIso }));

      if (jobsToInsert.length === 0) {
        console.log("[reels-worker] nothing new to enqueue for slot", {
          userId: row.user_id,
          runAt: runAtIso,
        });
        continue;
      }

      await deps.insertScheduledJobs(supabase, jobsToInsert);
      totalEnqueued += jobsToInsert.length;
      console.log("[reels-worker] scheduled jobs enqueued", {
        userId: row.user_id,
        runAt: runAtIso,
        enqueued: jobsToInsert.length,
      });
    }
  }

  console.log("[reels-worker] scheduling scan completed", { totalEnqueued });
  return totalEnqueued;
}

function getPriority(source: TriggerSource | undefined): number {
  if (source === "manual_global" || source === "manual_field") {
    return 0;
  }
  return 1;
}

export function pickNextReelGenerationJob(
  jobs: QueueJobLike[],
): QueueJobLike | null {
  if (jobs.length === 0) {
    return null;
  }

  return [...jobs].sort((left, right) => {
    const priorityDelta =
      getPriority(left.trigger_source) - getPriority(right.trigger_source);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return left.run_at.localeCompare(right.run_at);
  })[0];
}

export async function processNextReelGenerationJob(
  supabase: ReelSupabaseClient,
  deps: WorkerDeps = defaultDeps,
): Promise<{ processed: boolean; error?: string }> {
  const enqueued = await enqueueScheduledIdeaReels(supabase, deps);
  if (enqueued > 0) {
    console.log("[reels-worker] new jobs ready from scheduler", { enqueued });
  }

  const nowIso = deps.now().toISOString();
  const jobs = await deps.listJobs(supabase, nowIso);
  console.log("[reels-worker] pending jobs snapshot", {
    now: nowIso,
    count: jobs.length,
  });
  const nextJob = pickNextReelGenerationJob(jobs);

  if (!nextJob) {
    return { processed: false };
  }
  console.log("[reels-worker] selected job", {
    jobId: nextJob.id,
    userId: nextJob.user_id,
    reelId: nextJob.reel_id,
    triggerSource: nextJob.trigger_source ?? "scheduled",
    targetField: nextJob.target_field ?? null,
  });

  const claimed = await deps.updateJob(supabase, nextJob.id, {
    status: "processing",
    started_at: nowIso,
    updated_at: nowIso,
  });
  if (claimed.error) {
    return { processed: false, error: claimed.error.message };
  }

  await deps.insertLog(supabase, nextJob.user_id, {
    status: "started",
    reelId: nextJob.reel_id,
    jobId: nextJob.id,
    metadata: {
      triggerSource: nextJob.trigger_source ?? "scheduled",
      targetField: nextJob.target_field ?? null,
    },
  });

  const result = nextJob.target_field
    ? await deps.generateField(
        supabase,
        nextJob.user_id,
        nextJob.reel_id,
        nextJob.target_field,
      )
    : await deps.generateGlobal(supabase, nextJob.user_id, nextJob.reel_id);

  const doneAt = deps.now().toISOString();
  const status = result.success ? "completed" : "failed";
  const update = await deps.updateJob(supabase, nextJob.id, {
    status,
    completed_at: doneAt,
    error_message: result.success
      ? null
      : (result.message ?? "Generation failed"),
    updated_at: doneAt,
  });
  if (update.error) {
    return { processed: false, error: update.error.message };
  }

  await deps.insertLog(supabase, nextJob.user_id, {
    status,
    reelId: nextJob.reel_id,
    jobId: nextJob.id,
    metadata: {
      triggerSource: nextJob.trigger_source ?? "scheduled",
      targetField: nextJob.target_field ?? null,
    },
    errorMessage: result.success
      ? null
      : (result.message ?? "Generation failed"),
  });

  console.log("[reels-worker] job completed", {
    jobId: nextJob.id,
    userId: nextJob.user_id,
    status,
    message: result.success ? "ok" : (result.message ?? "Generation failed"),
  });

  return { processed: true };
}
