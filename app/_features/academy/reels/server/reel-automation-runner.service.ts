import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/app/_server/supabase/database.types";
import { generateReelFields } from "./reel-generation.service";
import { listIdeaReelIdsByUser } from "./reel-generation.repository";
import { updateAutomationRun as persistAutomationRunUpdate } from "./reel-idea-generation.repository";
import { runReelIdeaGeneration } from "./reel-idea-generation.service";

type ReelSupabaseClient = SupabaseClient<Database>;
type AutomationRunUpdate = Database["public"]["Tables"]["academy_reel_automation_runs"]["Update"];
type AutomationRunMetadata = Database["public"]["Tables"]["academy_reel_automation_runs"]["Row"]["metadata"];
type AutomationRunFlow = "reel_scripting" | "reel_idea_generation";
type AutomationRunTrigger = "scheduled" | "manual";

export interface ExecuteAutomationRunInput {
  runId: string;
  userId: string;
  flow: AutomationRunFlow;
  trigger: AutomationRunTrigger;
  slot: string | null;
}

interface FlowExecutionResult {
  success: boolean;
  message?: string;
  metadata?: Record<string, unknown>;
}

interface RunnerDeps {
  updateAutomationRun: (
    supabase: ReelSupabaseClient,
    runId: string,
    patch: AutomationRunUpdate,
  ) => Promise<void>;
  runIdeaGeneration: (
    supabase: ReelSupabaseClient,
    input: ExecuteAutomationRunInput,
  ) => Promise<FlowExecutionResult>;
  runReelScripting: (
    supabase: ReelSupabaseClient,
    input: ExecuteAutomationRunInput,
  ) => Promise<FlowExecutionResult>;
  now: () => Date;
}

const defaultDeps: RunnerDeps = {
  async updateAutomationRun(supabase, runId, patch) {
    const { error } = await persistAutomationRunUpdate(supabase, runId, patch);
    if (error) {
      throw new Error(error.message);
    }
  },
  async runIdeaGeneration(supabase, input) {
    const result = await runReelIdeaGeneration(supabase, {
      userId: input.userId,
      trigger: input.trigger,
      slot: input.slot,
      existingRunId: input.runId,
    });

    if (!result.success) {
      return {
        success: false,
        message: result.message,
        metadata: {
          error: result.error,
        },
      };
    }

    return {
      success: true,
      metadata: {
        delegatedRunId: result.runId,
        requestedCount: result.requestedCount,
        createdCount: result.createdCount,
        partial: result.partial,
        noOpReason: result.noOpReason ?? null,
      },
    };
  },
  async runReelScripting(supabase, input) {
    const { data, error } = await listIdeaReelIdsByUser(supabase, input.userId);
    if (error) {
      return {
        success: false,
        message: error.message,
        metadata: {
          error: "LOAD_FAILED",
        },
      };
    }

    const reelIds = (data ?? []).map((row) => row.id).filter((id): id is string => typeof id === "string");

    if (reelIds.length === 0) {
      return {
        success: true,
        metadata: {
          processedCount: 0,
          failedCount: 0,
          noOpReason: "no idea reels available",
        },
      };
    }

    let processedCount = 0;
    let failedCount = 0;

    for (const reelId of reelIds) {
      const result = await generateReelFields(supabase, input.userId, reelId);
      if (result.success) {
        processedCount += 1;
      } else {
        failedCount += 1;
      }
    }

    return {
      success: failedCount === 0,
      message: failedCount === 0 ? undefined : "One or more reels failed during scripting automation",
      metadata: {
        processedCount,
        failedCount,
        error: failedCount === 0 ? null : "PARTIAL_REEL_SCRIPTING_FAILURE",
      },
    };
  },
  now: () => new Date(),
};

function toFinalMetadata(
  input: ExecuteAutomationRunInput,
  result: FlowExecutionResult,
): AutomationRunMetadata {
  return {
    flow: input.flow,
    trigger: input.trigger,
    slot: input.slot,
    ...(result.metadata ?? {}),
    errorMessage: result.success ? null : (result.message ?? "Automation run failed"),
  } as AutomationRunMetadata;
}

export async function executeAutomationRunProcess(
  supabase: ReelSupabaseClient,
  input: ExecuteAutomationRunInput,
  deps: RunnerDeps = defaultDeps,
): Promise<{ success: boolean; message?: string }> {
  const startedAt = deps.now().toISOString();
  await deps.updateAutomationRun(supabase, input.runId, {
    status: "processing",
    started_at: startedAt,
    metadata: {
      flow: input.flow,
      trigger: input.trigger,
      slot: input.slot,
    },
  });

  let result: FlowExecutionResult;

  try {
    result =
      input.flow === "reel_idea_generation"
        ? await deps.runIdeaGeneration(supabase, input)
        : await deps.runReelScripting(supabase, input);
  } catch (error) {
    result = {
      success: false,
      message: error instanceof Error ? error.message : "Unknown automation runner error",
      metadata: {
        error: "RUNNER_EXECUTION_ERROR",
      },
    };
  }

  const completedAt = deps.now().toISOString();
  await deps.updateAutomationRun(supabase, input.runId, {
    status: result.success ? "completed" : "failed",
    completed_at: completedAt,
    metadata: toFinalMetadata(input, result),
  });

  return {
    success: result.success,
    message: result.message,
  };
}
