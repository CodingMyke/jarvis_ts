import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/app/_server/supabase/database.types";
import {
  userSettingsSchema,
  userSettingsUpdateSchema,
  userTimezoneSchema,
  type UserSettings,
  type UserSettingsUpdate,
} from "../lib/user-settings.schemas";

type UserSettingsSupabase = SupabaseClient<Database>;

interface ServiceFailure {
  success: false;
  error: "LOAD_FAILED" | "NOT_FOUND" | "ENSURE_FAILED" | "UPDATE_FAILED";
  message: string;
}

interface SettingsSuccess {
  success: true;
  settings: UserSettings;
}

function getErrorMessage(error: { message?: string } | null, fallback: string): string {
  return error?.message ?? fallback;
}

function toUserSettings(row: unknown): UserSettings | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const parsed = userSettingsSchema.safeParse({
    userId: (row as { user_id?: unknown }).user_id,
    timezone: (row as { timezone?: unknown }).timezone,
  });

  return parsed.success ? parsed.data : null;
}

export async function getUserSettings(
  supabase: UserSettingsSupabase,
  userId: string,
): Promise<SettingsSuccess | ServiceFailure> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("user_id, timezone")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return {
      success: false,
      error: "LOAD_FAILED",
      message: getErrorMessage(error, "Unable to load user settings."),
    };
  }

  const settings = toUserSettings(data);

  if (!settings) {
    return {
      success: false,
      error: "NOT_FOUND",
      message: "User settings not found.",
    };
  }

  return { success: true, settings };
}

export async function ensureUserSettings(
  supabase: UserSettingsSupabase,
  userId: string,
  timezone: string,
): Promise<SettingsSuccess | ServiceFailure> {
  const parsedTimezone = userTimezoneSchema.safeParse(timezone);

  if (!parsedTimezone.success) {
    return {
      success: false,
      error: "ENSURE_FAILED",
      message: parsedTimezone.error.message,
    };
  }

  const current = await getUserSettings(supabase, userId);

  if (current.success) {
    return current;
  }

  if (current.error !== "NOT_FOUND") {
    return {
      success: false,
      error: "ENSURE_FAILED",
      message: current.message,
    };
  }

  const { data, error } = await supabase
    .from("user_settings")
    .insert({
      user_id: userId,
      timezone: parsedTimezone.data,
    })
    .select("user_id, timezone")
    .single();

  const settings = toUserSettings(data);

  if (error || !settings) {
    return {
      success: false,
      error: "ENSURE_FAILED",
      message: getErrorMessage(error, "Unable to ensure user settings."),
    };
  }

  return { success: true, settings };
}

export async function updateUserSettings(
  supabase: UserSettingsSupabase,
  userId: string,
  input: UserSettingsUpdate,
): Promise<SettingsSuccess | ServiceFailure> {
  const parsed = userSettingsUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "UPDATE_FAILED",
      message: parsed.error.message,
    };
  }

  const { data, error } = await supabase
    .from("user_settings")
    .update({
      timezone: parsed.data.timezone,
    })
    .eq("user_id", userId)
    .select("user_id, timezone")
    .single();

  const settings = toUserSettings(data);

  if (error) {
    return {
      success: false,
      error: "UPDATE_FAILED",
      message: getErrorMessage(error, "Unable to update user settings."),
    };
  }

  if (!settings) {
    return {
      success: false,
      error: "NOT_FOUND",
      message: "User settings not found.",
    };
  }

  return { success: true, settings };
}
