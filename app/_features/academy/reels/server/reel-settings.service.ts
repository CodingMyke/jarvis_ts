import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/app/_server/supabase/database.types";
import { reelAutomationSettingsSchema } from "../lib/reel-generation.schemas";
import type { ReelAutomationSettings } from "../lib/reel-generation.types";
import { getGenerationSettingsByUser, upsertGenerationSettings } from "./reel-generation.repository";

type ReelSupabaseClient = SupabaseClient<Database>;

interface ServiceFailure {
  success: false;
  error: "LOAD_FAILED" | "NOT_FOUND" | "UPDATE_FAILED";
  message: string;
}

interface SettingsSuccess {
  success: true;
  settings: ReelAutomationSettings;
}

export const DEFAULT_REEL_AUTOMATION_SETTINGS: ReelAutomationSettings = {
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

function getErrorMessage(error: { message?: string } | null, fallback: string): string {
  return error?.message ?? fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toLegacySettings(config: Record<string, unknown>): ReelAutomationSettings {
  const parsed = reelAutomationSettingsSchema.safeParse({
    reelScripting: {
      enabled: config.enabled,
      runTimes: config.runTimes,
      scriptingContext: config.editorialContext,
    },
    reelIdeaGeneration: DEFAULT_REEL_AUTOMATION_SETTINGS.reelIdeaGeneration,
  });

  if (parsed.success) {
    return parsed.data;
  }

  return DEFAULT_REEL_AUTOMATION_SETTINGS;
}

export function normalizeReelAutomationSettings(config: unknown): ReelAutomationSettings {
  if (
    isRecord(config) &&
    ("enabled" in config || "runTimes" in config || "editorialContext" in config) &&
    !("reelScripting" in config) &&
    !("reelIdeaGeneration" in config)
  ) {
    return toLegacySettings(config);
  }

  const parsed = reelAutomationSettingsSchema.safeParse(config ?? {});
  if (parsed.success) {
    return parsed.data;
  }

  return DEFAULT_REEL_AUTOMATION_SETTINGS;
}

export async function getReelAutomationSettings(
  supabase: ReelSupabaseClient,
  userId: string,
): Promise<SettingsSuccess | ServiceFailure> {
  const { data, error } = await getGenerationSettingsByUser(supabase, userId);

  if (error) {
    return {
      success: false,
      error: "LOAD_FAILED",
      message: getErrorMessage(error, "Unable to load reel automation settings"),
    };
  }

  if (!data) {
    return {
      success: true,
      settings: DEFAULT_REEL_AUTOMATION_SETTINGS,
    };
  }

  return {
    success: true,
    settings: normalizeReelAutomationSettings((data as { config?: unknown }).config),
  };
}

export async function updateReelAutomationSettings(
  supabase: ReelSupabaseClient,
  userId: string,
  input: ReelAutomationSettings,
): Promise<SettingsSuccess | ServiceFailure> {
  const parsed = reelAutomationSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "UPDATE_FAILED",
      message: parsed.error.message,
    };
  }

  const { data, error } = await upsertGenerationSettings(supabase, userId, parsed.data);

  if (error || !data) {
    return {
      success: false,
      error: "UPDATE_FAILED",
      message: getErrorMessage(error, "Unable to update reel automation settings"),
    };
  }

  return {
    success: true,
    settings: normalizeReelAutomationSettings((data as { config?: unknown }).config),
  };
}
