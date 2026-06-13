import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/app/_server/supabase/database.types";
import { generateReelGenerationObject } from "@/app/_server/ai/llm/openai-reel-generation";
import type { ReelRow } from "../lib/reel-board.types";
import type { ReelAutomationSettings, ReelGenerationTargetField } from "../lib/reel-generation.types";
import { reelAutomationSettingsSchema } from "../lib/reel-generation.schemas";
import { buildReelGenerationPrompt } from "./reel-generation.prompt";
import { getReelById, updateReelById } from "./reel-board.repository";
import { getGenerationSettingsByUser, insertRunLog } from "./reel-generation.repository";
import { z } from "zod";

type ReelSupabaseClient = SupabaseClient<Database>;

interface ServiceFailure {
  success: false;
  error: "NOT_FOUND" | "LOAD_FAILED" | "GENERATION_FAILED" | "UPDATE_FAILED";
  message: string;
}

interface ServiceSuccess {
  success: true;
}

function isCompleteText(value: string | null): boolean {
  return (value?.trim().length ?? 0) > 0;
}

function getMissingFields(reel: ReelRow): ReelGenerationTargetField[] {
  const missing: ReelGenerationTargetField[] = [];
  if (!isCompleteText(reel.title)) missing.push("title");
  if (!isCompleteText(reel.caption)) missing.push("caption");
  if (!isCompleteText(reel.body)) missing.push("body");
  if (!isCompleteText(reel.hashtags)) missing.push("hashtags");
  return missing;
}

function toSettings(config: unknown): ReelAutomationSettings {
  const parsed = reelAutomationSettingsSchema.safeParse(config ?? {});
  if (parsed.success) return parsed.data;
  return { enabled: false, runTimes: [], editorialContext: null };
}

function createOutputSchema(targetFields: ReelGenerationTargetField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of targetFields) {
    shape[field] = z.string().trim().min(1);
  }
  return z.object(shape);
}

async function loadReel(
  supabase: ReelSupabaseClient,
  userId: string,
  reelId: string,
): Promise<{ success: true; reel: ReelRow } | ServiceFailure> {
  const { data, error } = await getReelById(supabase, userId, reelId);
  if (error) {
    return { success: false, error: "LOAD_FAILED", message: error.message };
  }
  if (!data) {
    return { success: false, error: "NOT_FOUND", message: "Reel not found" };
  }
  return { success: true, reel: data as ReelRow };
}

export async function generateReelFields(
  supabase: ReelSupabaseClient,
  userId: string,
  reelId: string,
): Promise<ServiceSuccess | ServiceFailure> {
  const loaded = await loadReel(supabase, userId, reelId);
  if (!loaded.success) return loaded;
  const reel = loaded.reel;

  const targetFields = getMissingFields(reel);
  if (targetFields.length === 0) {
    return { success: true };
  }

  const { data: settingsRow } = await getGenerationSettingsByUser(supabase, userId);
  const settings = toSettings((settingsRow as { config?: unknown } | null)?.config);

  const prompt = buildReelGenerationPrompt({
    reel,
    targetFields,
    editorialContext: settings.editorialContext,
  });

  await insertRunLog(supabase, userId, {
    status: "started",
    reelId,
    metadata: { targetFields, mode: "global" },
  });

  const schema = createOutputSchema(targetFields);

  let object: Record<string, string> = {};
  let rawText = "";
  try {
    const generated = await generateReelGenerationObject({
      prompt,
      schema,
      targetFields,
    });
    object = generated.object as Record<string, string>;
    rawText = generated.rawText;
  } catch (error) {
    await insertRunLog(supabase, userId, {
      status: "failed",
      reelId,
      metadata: { targetFields, mode: "global", rawText: String(rawText) },
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return { success: false, error: "GENERATION_FAILED", message: "Unable to generate reel fields" };
  }

  const updates: Record<string, unknown> = {};
  let complete = true;
  for (const field of targetFields) {
    const value = object[field]?.trim();
    if (!value) {
      complete = false;
      continue;
    }
    updates[field] = value;
  }

  if (!complete) {
    updates.generation_status = "failed";
  } else {
    updates.generation_status = "completed";
  }

  const finalReel = { ...reel, ...(updates as Partial<ReelRow>) };
  const allAiFieldsComplete =
    isCompleteText(finalReel.title) &&
    isCompleteText(finalReel.caption) &&
    isCompleteText(finalReel.body) &&
    isCompleteText(finalReel.hashtags);

  if (complete && reel.status === "idea" && allAiFieldsComplete) {
    updates.status = "script";
  }

  const { error: updateError } = await updateReelById(supabase, userId, reelId, updates as never);
  if (updateError) {
    return { success: false, error: "UPDATE_FAILED", message: updateError.message };
  }

  await insertRunLog(supabase, userId, {
    status: complete ? "completed" : "failed",
    reelId,
    metadata: { targetFields, mode: "global", rawText },
    errorMessage: complete ? null : "Missing fields in model output",
  });

  return { success: true };
}

export async function generateReelField(
  supabase: ReelSupabaseClient,
  userId: string,
  reelId: string,
  field: ReelGenerationTargetField,
): Promise<ServiceSuccess | ServiceFailure> {
  const loaded = await loadReel(supabase, userId, reelId);
  if (!loaded.success) return loaded;
  const reel = loaded.reel;

  const targetFields: ReelGenerationTargetField[] = [field];

  const { data: settingsRow } = await getGenerationSettingsByUser(supabase, userId);
  const settings = toSettings((settingsRow as { config?: unknown } | null)?.config);

  const prompt = buildReelGenerationPrompt({
    reel,
    targetFields,
    editorialContext: settings.editorialContext,
  });

  await insertRunLog(supabase, userId, {
    status: "started",
    reelId,
    metadata: { targetFields, mode: "field" },
  });

  const schema = createOutputSchema(targetFields);

  let object: Record<string, string> = {};
  let rawText = "";
  try {
    const generated = await generateReelGenerationObject({
      prompt,
      schema,
      targetFields,
    });
    object = generated.object as Record<string, string>;
    rawText = generated.rawText;
  } catch (error) {
    await insertRunLog(supabase, userId, {
      status: "failed",
      reelId,
      metadata: { targetFields, mode: "field", rawText: String(rawText) },
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return { success: false, error: "GENERATION_FAILED", message: "Unable to generate reel field" };
  }

  const value = object[field]?.trim() ?? "";
  const complete = value.length > 0;

  const updates: Record<string, unknown> = {
    [field]: complete ? value : null,
    generation_status: complete ? "completed" : "failed",
  };

  const { error: updateError } = await updateReelById(supabase, userId, reelId, updates as never);
  if (updateError) {
    return { success: false, error: "UPDATE_FAILED", message: updateError.message };
  }

  await insertRunLog(supabase, userId, {
    status: complete ? "completed" : "failed",
    reelId,
    metadata: { targetFields, mode: "field", rawText },
    errorMessage: complete ? null : "Missing field in model output",
  });

  return { success: true };
}
