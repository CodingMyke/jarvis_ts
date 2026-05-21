import type { SupabaseClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { Database } from "@/app/_server/supabase/database.types";
import { reelAutomationSettingsSchema } from "../lib/reel-generation.schemas";
import type { ReelAutomationSettings } from "../lib/reel-generation.types";
import { getGenerationSettingsByUser } from "./reel-generation.repository";
import { buildReelIdeaGenerationPrompt } from "./reel-idea-generation.prompt";
import {
  countPendingAiIdeas,
  hasActiveFlowRun,
  insertAutomationRun,
  insertGeneratedAiIdeas,
  listLatestPublishedReels,
  listRecentEpisodicMemories,
  listRecentRejectedIdeas,
  listRecentSemanticMemories,
  updateAutomationRun,
} from "./reel-idea-generation.repository";

type ReelSupabaseClient = SupabaseClient<Database>;
type AutomationRunMetadata = Database["public"]["Tables"]["academy_reel_automation_runs"]["Row"]["metadata"];

const OPENAI_MODEL = "gpt-4o";
const SEMANTIC_MEMORY_CONTEXT_LIMIT = 5;
const EPISODIC_MEMORY_CONTEXT_LIMIT = 5;
const REJECTED_IDEA_CONTEXT_LIMIT = 10;

const reelIdeaGenerationOutputSchema = z.object({
  ideas: z.array(
    z.object({
      idea: z.string(),
      notes: z.string().nullable().optional(),
    }),
  ),
});

interface RunReelIdeaGenerationInput {
  userId: string;
  trigger: "manual" | "scheduled";
  slot: string | null;
  existingRunId?: string | null;
}

interface IdeaGenerationFailure {
  success: false;
  error:
    | "FLOW_ALREADY_RUNNING"
    | "LOAD_FAILED"
    | "GENERATION_FAILED"
    | "CREATE_FAILED"
    | "UPDATE_FAILED";
  message: string;
}

interface IdeaGenerationSuccess {
  success: true;
  runId: string | null;
  requestedCount: number;
  createdCount: number;
  partial: boolean;
  noOpReason?: string;
}

function toSettings(config: unknown): ReelAutomationSettings {
  const parsed = reelAutomationSettingsSchema.safeParse(config ?? {});
  if (parsed.success) {
    return parsed.data;
  }

  return {
    reelScripting: {
      enabled: false,
      runTimes: [],
      scriptingContext: null,
    },
    reelIdeaGeneration: {
      enabled: false,
      runTimes: [],
      ideasPerRun: 3,
      maxPendingAiIdeas: 10,
      latestPublishedReelsCount: 3,
      ideaGenerationContext: null,
    },
  };
}

function nowIsoString(): string {
  return new Date().toISOString();
}

async function markRunCompleted(
  supabase: ReelSupabaseClient,
  runId: string,
  status: "completed" | "failed",
  metadata: AutomationRunMetadata,
) {
  return updateAutomationRun(supabase, runId, {
    status,
    metadata,
    completed_at: nowIsoString(),
  });
}

export async function runReelIdeaGeneration(
  supabase: ReelSupabaseClient,
  input: RunReelIdeaGenerationInput,
): Promise<IdeaGenerationSuccess | IdeaGenerationFailure> {
  const managesOwnRun = !input.existingRunId;

  if (managesOwnRun) {
    try {
      const activeRun = await hasActiveFlowRun(supabase, {
        userId: input.userId,
        flow: "reel_idea_generation",
      });

      if (activeRun) {
        return {
          success: false,
          error: "FLOW_ALREADY_RUNNING",
          message: "Idea generation already running",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: "LOAD_FAILED",
        message: error instanceof Error ? error.message : "Unable to verify active run",
      };
    }
  }

  const { data: settingsRow, error: settingsError } = await getGenerationSettingsByUser(
    supabase,
    input.userId,
  );

  if (settingsError) {
    return { success: false, error: "LOAD_FAILED", message: settingsError.message };
  }

  const settings = toSettings((settingsRow as { config?: unknown } | null)?.config);
  const ideaSettings = settings.reelIdeaGeneration;

  const pendingAiIdeaCountResult = await countPendingAiIdeas(supabase, input.userId);
  if (pendingAiIdeaCountResult.error) {
    return {
      success: false,
      error: "LOAD_FAILED",
      message: pendingAiIdeaCountResult.error.message,
    };
  }

  const pendingAiIdeaCount = pendingAiIdeaCountResult.count ?? 0;
  const availableSlots = Math.max(0, ideaSettings.maxPendingAiIdeas - pendingAiIdeaCount);
  const requestedCount = Math.min(ideaSettings.ideasPerRun, availableSlots);

  if (requestedCount === 0) {
    return {
      success: true,
      runId: null,
      requestedCount: 0,
      createdCount: 0,
      partial: false,
      noOpReason: "ai_idea backlog limit reached",
    };
  }

  const runMetadata = {
    requestedCount,
    createdCount: 0,
    partial: false,
    trigger: input.trigger,
  } satisfies Record<string, unknown>;

  const runId = input.existingRunId ?? null;
  let runRow: { id: string } | null = runId ? { id: runId } : null;

  if (managesOwnRun) {
    const { data: insertedRun, error: insertRunError } = await insertAutomationRun(supabase, {
      user_id: input.userId,
      flow: "reel_idea_generation",
      trigger: input.trigger,
      slot: input.slot,
      status: "processing",
      started_at: nowIsoString(),
      metadata: runMetadata,
    });

    if (insertRunError || !insertedRun) {
      return {
        success: false,
        error: "CREATE_FAILED",
        message: insertRunError?.message ?? "Unable to create automation run",
      };
    }

    runRow = insertedRun;
  }

  const [
    latestPublishedReelsResult,
    semanticMemoriesResult,
    episodicMemoriesResult,
    rejectedIdeasResult,
  ] = await Promise.all([
    listLatestPublishedReels(supabase, input.userId, ideaSettings.latestPublishedReelsCount),
    listRecentSemanticMemories(supabase, input.userId, SEMANTIC_MEMORY_CONTEXT_LIMIT),
    listRecentEpisodicMemories(supabase, input.userId, EPISODIC_MEMORY_CONTEXT_LIMIT),
    listRecentRejectedIdeas(supabase, input.userId, REJECTED_IDEA_CONTEXT_LIMIT),
  ]);

  const loadError =
    latestPublishedReelsResult.error ??
    semanticMemoriesResult.error ??
    episodicMemoriesResult.error ??
    rejectedIdeasResult.error;

  if (loadError) {
    if (runRow && managesOwnRun) {
      await markRunCompleted(supabase, runRow.id, "failed", {
        ...runMetadata,
        error: loadError.message,
      });
    }
    return { success: false, error: "LOAD_FAILED", message: loadError.message };
  }

  const prompt = buildReelIdeaGenerationPrompt({
    ideaGenerationContext: ideaSettings.ideaGenerationContext,
    ideasPerRun: requestedCount,
    latestPublishedReels: latestPublishedReelsResult.data ?? [],
    semanticMemories: semanticMemoriesResult.data ?? [],
    episodicMemories: episodicMemoriesResult.data ?? [],
    rejectedIdeas: rejectedIdeasResult.data ?? [],
  });

  let generatedIdeas: z.infer<typeof reelIdeaGenerationOutputSchema>["ideas"] = [];
  let rawText = "";
  try {
    const result = await generateObject({
      model: openai(OPENAI_MODEL),
      system: prompt.system ?? undefined,
      prompt: prompt.prompt,
      schema: reelIdeaGenerationOutputSchema,
    });

    generatedIdeas = result.object.ideas;
    rawText = JSON.stringify(result.object);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unable to generate ideas";
    if (runRow && managesOwnRun) {
      await markRunCompleted(supabase, runRow.id, "failed", {
        ...runMetadata,
        rawText,
        error: errorMessage,
      });
    }
    return { success: false, error: "GENERATION_FAILED", message: errorMessage };
  }

  const validIdeas = generatedIdeas
    .map((ideaRow) => ({
      idea: ideaRow.idea.trim(),
      notes: ideaRow.notes?.trim() ? ideaRow.notes.trim() : null,
    }))
    .filter((ideaRow) => ideaRow.idea.length > 0);

  const partial = validIdeas.length < requestedCount;

  const { error: insertIdeasError } = await insertGeneratedAiIdeas(
    supabase,
    validIdeas.map((ideaRow) => ({
      user_id: input.userId,
      idea: ideaRow.idea,
      notes: ideaRow.notes,
      status: "ai_idea",
      origin: "ai_idea_generation",
      generation_status: "not_generated",
      last_idea_generation_run_id: runRow?.id ?? null,
    })),
  );

  if (insertIdeasError) {
    if (runRow && managesOwnRun) {
      await markRunCompleted(supabase, runRow.id, "failed", {
        ...runMetadata,
        rawText,
        error: insertIdeasError.message,
        createdCount: 0,
        partial,
      });
    }
    return { success: false, error: "CREATE_FAILED", message: insertIdeasError.message };
  }

  const completedMetadata = {
    ...runMetadata,
    rawText,
    partial,
    createdCount: validIdeas.length,
  } satisfies Record<string, unknown>;

  if (runRow && managesOwnRun) {
    const { error: updateRunError } = await markRunCompleted(
      supabase,
      runRow.id,
      "completed",
      completedMetadata,
    );

    if (updateRunError) {
      return { success: false, error: "UPDATE_FAILED", message: updateRunError.message };
    }
  }

  return {
    success: true,
    runId: runRow?.id ?? null,
    requestedCount,
    createdCount: validIdeas.length,
    partial,
  };
}

export async function triggerManualReelIdeaGeneration(
  supabase: ReelSupabaseClient,
  input: { userId: string },
): Promise<IdeaGenerationSuccess | IdeaGenerationFailure> {
  return runReelIdeaGeneration(supabase, {
    userId: input.userId,
    trigger: "manual",
    slot: null,
  });
}
