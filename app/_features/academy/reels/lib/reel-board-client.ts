import { getZodErrorMessage } from "@/app/_server/http/zod";
import {
  createReelSchema,
  reelBoardSchema,
  reelSchema,
  updateReelSchema,
  updateReelStatusSchema,
} from "./reel-board.schemas";
import type {
  CreateReelInput,
  ReelBoard,
  ReelRow,
  UpdateReelInput,
  UpdateReelStatusInput,
} from "./reel-board.types";

interface OperationError {
  success: false;
  error: string;
  errorMessage: string;
  status?: number;
}

interface ReelBoardApiResponse {
  success?: boolean;
  board?: unknown;
  reel?: unknown;
  reelId?: unknown;
  error?: string;
  message?: string;
  errorMessage?: string;
}

export type GetReelBoardOperationResult = { success: true; board: ReelBoard } | OperationError;
export type CreateReelOperationResult = { success: true; reel: ReelRow } | OperationError;
export type UpdateReelOperationResult = { success: true; reel: ReelRow } | OperationError;
export type UpdateReelStatusOperationResult = { success: true; reel: ReelRow } | OperationError;
export type DeleteReelOperationResult = { success: true; reelId: string } | OperationError;

function getOperationErrorMessage(response: ReelBoardApiResponse | null, fallback: string): string {
  return response?.errorMessage ?? response?.message ?? response?.error ?? fallback;
}

function toOperationError(
  response: ReelBoardApiResponse | null,
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

function toUnexpectedOperationError(error: unknown, fallbackMessage: string): OperationError {
  return {
    success: false,
    error: "EXECUTION_ERROR",
    errorMessage: error instanceof Error ? error.message : fallbackMessage,
  };
}

async function parseResponse(response: Response): Promise<ReelBoardApiResponse | null> {
  return (await response.json().catch(() => null)) as ReelBoardApiResponse | null;
}

export async function getReelBoard(): Promise<GetReelBoardOperationResult> {
  try {
    const response = await fetch("/api/academy/reels");
    const data = await parseResponse(response);
    const parsedBoard = reelBoardSchema.safeParse(data?.board);

    if (!response.ok || !data?.success || !parsedBoard.success) {
      return toOperationError(
        data,
        "GET_REEL_BOARD_FAILED",
        `HTTP error ${response.status}`,
        response.status,
      );
    }

    return {
      success: true,
      board: parsedBoard.data,
    };
  } catch (error) {
    return toUnexpectedOperationError(error, "Unknown error while loading the reel board.");
  }
}

export async function createReel(input: CreateReelInput): Promise<CreateReelOperationResult> {
  const parsed = createReelSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "INVALID_PAYLOAD",
      errorMessage: getZodErrorMessage(parsed.error),
      status: 400,
    };
  }

  try {
    const response = await fetch("/api/academy/reels", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
    });
    const data = await parseResponse(response);
    const parsedReel = reelSchema.safeParse(data?.reel);

    if (!response.ok || !data?.success || !parsedReel.success) {
      return toOperationError(
        data,
        "CREATION_FAILED",
        `HTTP error ${response.status}`,
        response.status,
      );
    }

    return {
      success: true,
      reel: parsedReel.data,
    };
  } catch (error) {
    return toUnexpectedOperationError(error, "Unknown error while creating the reel.");
  }
}

export async function updateReel(
  reelId: string,
  input: UpdateReelInput,
): Promise<UpdateReelOperationResult> {
  const parsed = updateReelSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "INVALID_PAYLOAD",
      errorMessage: getZodErrorMessage(parsed.error),
      status: 400,
    };
  }

  try {
    const response = await fetch(`/api/academy/reels/${reelId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
    });
    const data = await parseResponse(response);
    const parsedReel = reelSchema.safeParse(data?.reel);

    if (!response.ok || !data?.success || !parsedReel.success) {
      return toOperationError(
        data,
        "UPDATE_FAILED",
        `HTTP error ${response.status}`,
        response.status,
      );
    }

    return {
      success: true,
      reel: parsedReel.data,
    };
  } catch (error) {
    return toUnexpectedOperationError(error, "Unknown error while updating the reel.");
  }
}

export async function updateReelStatus(
  reelId: string,
  input: UpdateReelStatusInput,
): Promise<UpdateReelStatusOperationResult> {
  const parsed = updateReelStatusSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "INVALID_PAYLOAD",
      errorMessage: getZodErrorMessage(parsed.error),
      status: 400,
    };
  }

  try {
    const response = await fetch(`/api/academy/reels/${reelId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
    });
    const data = await parseResponse(response);
    const parsedReel = reelSchema.safeParse(data?.reel);

    if (!response.ok || !data?.success || !parsedReel.success) {
      return toOperationError(
        data,
        "UPDATE_FAILED",
        `HTTP error ${response.status}`,
        response.status,
      );
    }

    return {
      success: true,
      reel: parsedReel.data,
    };
  } catch (error) {
    return toUnexpectedOperationError(error, "Unknown error while updating the reel status.");
  }
}

export async function deleteReel(reelId: string): Promise<DeleteReelOperationResult> {
  try {
    const response = await fetch(`/api/academy/reels/${reelId}`, {
      method: "DELETE",
    });
    const data = await parseResponse(response);

    if (!response.ok || !data?.success || typeof data.reelId !== "string") {
      return toOperationError(
        data,
        "DELETE_FAILED",
        `HTTP error ${response.status}`,
        response.status,
      );
    }

    return {
      success: true,
      reelId: data.reelId,
    };
  } catch (error) {
    return toUnexpectedOperationError(error, "Unknown error while deleting the reel.");
  }
}
