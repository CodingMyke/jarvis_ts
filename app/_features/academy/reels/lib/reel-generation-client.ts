import { z } from "zod";
import { getZodErrorMessage } from "@/app/_server/http/zod";
import { REEL_GENERATION_TARGET_FIELDS } from "./reel-generation.constants";

interface OperationError {
  success: false;
  error: string;
  errorMessage: string;
  status?: number;
}

export type GenerationOperationResult = { success: true } | OperationError;

const reelIdSchema = z.string().uuid();
const fieldSchema = z.enum(REEL_GENERATION_TARGET_FIELDS);

async function parseResponse(response: Response): Promise<{ success?: boolean; error?: string; message?: string } | null> {
  return (await response.json().catch(() => null)) as { success?: boolean; error?: string; message?: string } | null;
}

function toOperationError(
  response: { error?: string; message?: string } | null,
  fallbackError: string,
  fallbackMessage: string,
  status?: number,
): OperationError {
  return {
    success: false,
    error: response?.error ?? fallbackError,
    errorMessage: response?.message ?? fallbackMessage,
    status,
  };
}

export async function generateReelFields(reelId: string): Promise<GenerationOperationResult> {
  const parsedReelId = reelIdSchema.safeParse(reelId);
  if (!parsedReelId.success) {
    return {
      success: false,
      error: "INVALID_PARAMS",
      errorMessage: getZodErrorMessage(parsedReelId.error),
      status: 400,
    };
  }

  try {
    const response = await fetch(`/api/academy/reels/${parsedReelId.data}/generate`, { method: "POST" });
    const data = await parseResponse(response);

    if (!response.ok || !data?.success) {
      return toOperationError(data, "GENERATION_FAILED", `HTTP error ${response.status}`, response.status);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: "EXECUTION_ERROR",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function generateReelField(
  reelId: string,
  field: string,
): Promise<GenerationOperationResult> {
  const parsedReelId = reelIdSchema.safeParse(reelId);
  if (!parsedReelId.success) {
    return {
      success: false,
      error: "INVALID_PARAMS",
      errorMessage: getZodErrorMessage(parsedReelId.error),
      status: 400,
    };
  }

  const parsedField = fieldSchema.safeParse(field);
  if (!parsedField.success) {
    return {
      success: false,
      error: "INVALID_PARAMS",
      errorMessage: getZodErrorMessage(parsedField.error),
      status: 400,
    };
  }

  try {
    const response = await fetch(
      `/api/academy/reels/${parsedReelId.data}/generate/${parsedField.data}`,
      { method: "POST" },
    );
    const data = await parseResponse(response);

    if (!response.ok || !data?.success) {
      return toOperationError(data, "GENERATION_FAILED", `HTTP error ${response.status}`, response.status);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: "EXECUTION_ERROR",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

