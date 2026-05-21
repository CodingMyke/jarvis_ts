import { getZodErrorMessage } from "@/app/_server/http/zod";
import {
  userSettingsSchema,
  userSettingsUpdateSchema,
  type UserSettings,
  type UserSettingsUpdate,
} from "./user-settings.schemas";

interface OperationError {
  success: false;
  error: string;
  errorMessage: string;
  status?: number;
}

interface SettingsApiResponse {
  success?: boolean;
  settings?: unknown;
  error?: string;
  message?: string;
  errorMessage?: string;
}

export type GetUserSettingsResult = { success: true; settings: UserSettings } | OperationError;
export type EnsureUserSettingsResult = { success: true; settings: UserSettings } | OperationError;
export type UpdateUserSettingsResult = { success: true; settings: UserSettings } | OperationError;

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

export async function getUserSettings(): Promise<GetUserSettingsResult> {
  try {
    const response = await fetch("/api/user/settings");
    const data = await parseResponse(response);
    const parsedSettings = userSettingsSchema.safeParse(data?.settings);

    if (!response.ok || !data?.success || !parsedSettings.success) {
      return toOperationError(
        data,
        "GET_USER_SETTINGS_FAILED",
        `HTTP error ${response.status}`,
        response.status,
      );
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

export async function ensureUserSettings(
  timezone: string,
): Promise<EnsureUserSettingsResult> {
  const parsedPatch = userSettingsUpdateSchema.safeParse({ timezone });

  if (!parsedPatch.success) {
    return {
      success: false,
      error: "INVALID_PAYLOAD",
      errorMessage: getZodErrorMessage(parsedPatch.error),
      status: 400,
    };
  }

  try {
    const response = await fetch("/api/user/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsedPatch.data),
    });
    const data = await parseResponse(response);
    const parsedSettings = userSettingsSchema.safeParse(data?.settings);

    if (!response.ok || !data?.success || !parsedSettings.success) {
      return toOperationError(
        data,
        "ENSURE_USER_SETTINGS_FAILED",
        `HTTP error ${response.status}`,
        response.status,
      );
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

export async function updateUserSettings(
  patch: UserSettingsUpdate,
): Promise<UpdateUserSettingsResult> {
  const parsedPatch = userSettingsUpdateSchema.safeParse(patch);

  if (!parsedPatch.success) {
    return {
      success: false,
      error: "INVALID_PAYLOAD",
      errorMessage: getZodErrorMessage(parsedPatch.error),
      status: 400,
    };
  }

  try {
    const response = await fetch("/api/user/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsedPatch.data),
    });
    const data = await parseResponse(response);
    const parsedSettings = userSettingsSchema.safeParse(data?.settings);

    if (!response.ok || !data?.success || !parsedSettings.success) {
      return toOperationError(
        data,
        "UPDATE_USER_SETTINGS_FAILED",
        `HTTP error ${response.status}`,
        response.status,
      );
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
