import { spawn } from "node:child_process";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/app/_server/supabase/database.types";
import { hasActiveFlowRun, insertAutomationRun, updateAutomationRun } from "./reel-idea-generation.repository";
import { listGenerationSettingsRows } from "./reel-generation.repository";
import { normalizeReelAutomationSettings } from "./reel-settings.service";

type ReelSupabaseClient = SupabaseClient<Database>;
type AutomationRunInsert = Database["public"]["Tables"]["academy_reel_automation_runs"]["Insert"];
type AutomationRunUpdate = Database["public"]["Tables"]["academy_reel_automation_runs"]["Update"];
type AutomationRunFlow = "reel_scripting" | "reel_idea_generation";
type AutomationRunTrigger = "scheduled" | "manual";

interface GenerationSettingsRowLike {
  user_id: string;
  config: unknown;
  timezone?: string;
}

interface DueAutomationRun {
  userId: string;
  flow: AutomationRunFlow;
  trigger: AutomationRunTrigger;
  slot: string;
}

interface SpawnRunProcessInput extends DueAutomationRun {
  runId: string;
}

interface CreatedAutomationRun {
  id: string;
}

interface WorkerDeps {
  listSettings: (supabase: ReelSupabaseClient) => Promise<GenerationSettingsRowLike[]>;
  hasActiveRun: (
    supabase: ReelSupabaseClient,
    input: { userId: string; flow: AutomationRunFlow },
  ) => Promise<boolean>;
  createAutomationRun: (
    supabase: ReelSupabaseClient,
    input: DueAutomationRun & { status: "queued" },
  ) => Promise<CreatedAutomationRun>;
  updateAutomationRun: (
    supabase: ReelSupabaseClient,
    runId: string,
    patch: AutomationRunUpdate,
  ) => Promise<void>;
  spawnRunProcess: (input: SpawnRunProcessInput) => Promise<{ success: boolean; message?: string }>;
  now: () => Date;
}

function getTimePartsInTimezone(now: Date, timezone: string): Record<string, string> {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return Object.fromEntries(
    formatter
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

function toSlotIso(now: Date, runTime: string, timezone: string): string | null {
  const [hourRaw, minuteRaw] = runTime.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return null;
  }

  const parts = getTimePartsInTimezone(now, timezone);
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const targetLocalTimestamp = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let slot = new Date(targetLocalTimestamp);
  const resolvedParts = getTimePartsInTimezone(slot, timezone);
  const resolvedLocalTimestamp = Date.UTC(
    Number(resolvedParts.year),
    Number(resolvedParts.month) - 1,
    Number(resolvedParts.day),
    Number(resolvedParts.hour),
    Number(resolvedParts.minute),
    0,
    0,
  );

  slot = new Date(slot.getTime() + (targetLocalTimestamp - resolvedLocalTimestamp));
  slot.setUTCSeconds(0, 0);
  return slot.toISOString();
}

function isDueForRunTime(now: Date, runTime: string, timezone: string): boolean {
  const [hourRaw, minuteRaw] = runTime.split(":");
  if (hourRaw === undefined || minuteRaw === undefined) {
    return false;
  }

  const parts = getTimePartsInTimezone(now, timezone);
  return parts.hour === hourRaw && parts.minute === minuteRaw;
}

function getDueRunsForUser(row: GenerationSettingsRowLike, now: Date): DueAutomationRun[] {
  const settings = normalizeReelAutomationSettings(row.config);
  const timezone = row.timezone ?? "UTC";
  const dueRuns: DueAutomationRun[] = [];

  const flowEntries: Array<{
    flow: AutomationRunFlow;
    enabled: boolean;
    runTimes: string[];
  }> = [
    {
      flow: "reel_scripting",
      enabled: settings.reelScripting.enabled,
      runTimes: settings.reelScripting.runTimes,
    },
    {
      flow: "reel_idea_generation",
      enabled: settings.reelIdeaGeneration.enabled,
      runTimes: settings.reelIdeaGeneration.runTimes,
    },
  ];

  for (const entry of flowEntries) {
    if (!entry.enabled) {
      continue;
    }

    for (const runTime of entry.runTimes) {
      if (!isDueForRunTime(now, runTime, timezone)) {
        continue;
      }

      const slot = toSlotIso(now, runTime, timezone);
      if (!slot) {
        continue;
      }

      dueRuns.push({
        userId: row.user_id,
        flow: entry.flow,
        trigger: "scheduled",
        slot,
      });
    }
  }

  return dueRuns;
}

const defaultDeps: WorkerDeps = {
  async listSettings(supabase) {
    const { data } = await listGenerationSettingsRows(supabase);
    const settingsRows = (data ?? []) as GenerationSettingsRowLike[];

    if (settingsRows.length === 0) {
      return settingsRows;
    }

    const { data: timezoneRows } = await supabase
      .from("user_settings")
      .select("user_id, timezone")
      .in("user_id", settingsRows.map((row) => row.user_id));

    const timezoneByUserId = new Map(
      ((timezoneRows ?? []) as Array<{ user_id: string; timezone: string | null }>).map((row) => [
        row.user_id,
        row.timezone ?? undefined,
      ]),
    );

    return settingsRows.map((row) => ({
      ...row,
      timezone: timezoneByUserId.get(row.user_id),
    }));
  },
  hasActiveRun: hasActiveFlowRun,
  async createAutomationRun(supabase, input) {
    const insertInput: AutomationRunInsert = {
      user_id: input.userId,
      flow: input.flow,
      trigger: input.trigger,
      slot: input.slot,
      status: input.status,
      metadata: {},
    };

    const { data, error } = await insertAutomationRun(supabase, insertInput);
    if (error || !data) {
      throw new Error(error?.message ?? "Unable to create automation run");
    }

    return { id: data.id };
  },
  async updateAutomationRun(supabase, runId, patch) {
    const { error } = await updateAutomationRun(supabase, runId, patch);
    if (error) {
      throw new Error(error.message);
    }
  },
  async spawnRunProcess(input) {
    const scriptPath = path.resolve(process.cwd(), "scripts/reel-automation-run.ts");
    const child = spawn(
      process.execPath,
      [
        "--env-file=.env.local",
        "--import",
        "tsx",
        scriptPath,
        "--run-id",
        input.runId,
        "--user-id",
        input.userId,
        "--flow",
        input.flow,
        "--trigger",
        input.trigger,
        "--slot",
        input.slot,
      ],
      {
        stdio: "inherit",
      },
    );

    return await new Promise<{ success: boolean; message?: string }>((resolve) => {
      child.once("spawn", () => resolve({ success: true }));
      child.once("error", (error) => resolve({ success: false, message: error.message }));
    });
  },
  now: () => new Date(),
};

export async function processDueAutomationRuns(
  supabase: ReelSupabaseClient,
  deps: WorkerDeps = defaultDeps,
): Promise<{ discovered: number; spawned: number; failed: number }> {
  const now = deps.now();
  const settingsRows = await deps.listSettings(supabase);
  let discovered = 0;
  let spawned = 0;
  let failed = 0;

  for (const row of settingsRows) {
    const dueRuns = getDueRunsForUser(row, now);

    for (const dueRun of dueRuns) {
      const hasActiveRun = await deps.hasActiveRun(supabase, {
        userId: dueRun.userId,
        flow: dueRun.flow,
      });

      if (hasActiveRun) {
        continue;
      }

      discovered += 1;
      const createdRun = await deps.createAutomationRun(supabase, {
        ...dueRun,
        status: "queued",
      });

      const spawnedProcess = await deps.spawnRunProcess({
        ...dueRun,
        runId: createdRun.id,
      });

      if (!spawnedProcess.success) {
        failed += 1;
        await deps.updateAutomationRun(supabase, createdRun.id, {
          status: "failed",
          completed_at: now.toISOString(),
          metadata: {
            error: spawnedProcess.message ?? "Unable to spawn automation run process",
          },
        });
        continue;
      }

      spawned += 1;
    }
  }

  return { discovered, spawned, failed };
}

