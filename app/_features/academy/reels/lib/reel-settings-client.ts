import { getZodErrorMessage } from "@/app/_server/http/zod";
import { reelAutomationSettingsPatchSchema, reelAutomationSettingsSchema } from "./reel-generation.schemas";
import type { ReelAutomationSettings } from "./reel-generation.types";

interface OperationError {
  success: false;
  error: string;
  errorMessage: string;
  status?: number;
}

type SettingsApiResponse = {
  success?: boolean;
  settings?: unknown;
  error?: string;
  message?: string;
  errorMessage?: string;
};

export type GetSettingsResult = { success: true; settings: ReelAutomationSettings } | OperationError;
export type UpdateSettingsResult = { success: true; settings: ReelAutomationSettings } | OperationError;
export type ReelAutomationSettingsPatch = Partial<{
  reelScripting: Partial<ReelAutomationSettings["reelScripting"]>;
  reelIdeaGeneration: Partial<ReelAutomationSettings["reelIdeaGeneration"]>;
}>;

async function parseResponse(response: Response): Promise<SettingsApiResponse | null> {
  return (await response.json().catch(() => null)) as SettingsApiResponse | null;
}

function getOperationErrorMessage(response: SettingsApiResponse | null, fallback: string): string {
  return response?.errorMessage ?? response?.message ?? response?.error ?? fallback;
}

function toOperationError(
  response: SettingsApiResponse | null,
  fallbackError: string,
  fallbackMessage: string,
  status?: number,
): OperationError {
  return {
    success: false,
    error: response?.error ?? fallbackError,
    errorMessage: getOperationErrorMessage(response, fallbackMessage),
    status,
  };
}

export async function getReelAutomationSettings(): Promise<GetSettingsResult> {
  try {
    const response = await fetch("/api/academy/reels/settings");
    const data = await parseResponse(response);
    const parsedSettings = reelAutomationSettingsSchema.safeParse(data?.settings);

    if (!response.ok || !data?.success || !parsedSettings.success) {
      return toOperationError(data, "GET_SETTINGS_FAILED", `HTTP error ${response.status}`, response.status);
    }

    return { success: true, settings: parsedSettings.data };
  } catch (error) {
    return {
      success: false,
      error: "EXECUTION_ERROR",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function updateReelAutomationSettings(
  patch: ReelAutomationSettingsPatch,
): Promise<UpdateSettingsResult> {
  const parsedPatch = reelAutomationSettingsPatchSchema.safeParse(patch);

  if (!parsedPatch.success) {
    return {
      success: false,
      error: "INVALID_PAYLOAD",
      errorMessage: getZodErrorMessage(parsedPatch.error),
      status: 400,
    };
  }

  try {
    const response = await fetch("/api/academy/reels/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsedPatch.data),
    });
    const data = await parseResponse(response);
    const parsedSettings = reelAutomationSettingsSchema.safeParse(data?.settings);

    if (!response.ok || !data?.success || !parsedSettings.success) {
      return toOperationError(data, "UPDATE_SETTINGS_FAILED", `HTTP error ${response.status}`, response.status);
    }

    return { success: true, settings: parsedSettings.data };
  } catch (error) {
    return {
      success: false,
      error: "EXECUTION_ERROR",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
