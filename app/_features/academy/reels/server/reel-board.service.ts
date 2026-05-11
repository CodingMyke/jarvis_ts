import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/app/_server/supabase/database.types";
import { REEL_BOARD_DEFAULT_STATUS, REEL_BOARD_STATUSES } from "../lib/reel-board.constants";
import type {
  CreateReelInput,
  ReelBoard,
  ReelBoardColumns,
  ReelRow,
  UpdateReelInput,
  UpdateReelStatusInput,
} from "../lib/reel-board.types";
import {
  deleteReelById,
  insertReel,
  listReelsByUser,
  updateReelById,
} from "./reel-board.repository";

type ReelSupabaseClient = SupabaseClient<Database>;

interface ServiceFailure {
  success: false;
  error: "CREATION_FAILED" | "DELETE_FAILED" | "LIST_FAILED" | "NOT_FOUND" | "UPDATE_FAILED";
  message: string;
}

interface BoardSuccess {
  success: true;
  board: ReelBoard;
}

interface ReelSuccess {
  success: true;
  reel: ReelRow;
}

interface DeleteSuccess {
  success: true;
  reelId: string;
}

function createEmptyColumns(): ReelBoardColumns {
  return Object.fromEntries(
    REEL_BOARD_STATUSES.map((status) => [status, []]),
  ) as unknown as ReelBoardColumns;
}

function getErrorMessage(error: { message?: string } | null, fallback: string): string {
  return error?.message ?? fallback;
}

export async function getReelBoard(
  supabase: ReelSupabaseClient,
  userId: string,
): Promise<BoardSuccess | ServiceFailure> {
  const { data, error } = await listReelsByUser(supabase, userId);

  if (error) {
    return {
      success: false,
      error: "LIST_FAILED",
      message: getErrorMessage(error, "Unable to load reels"),
    };
  }

  const columns = createEmptyColumns();
  const reels = (data ?? []) as ReelRow[];

  for (const reel of reels) {
    columns[reel.status as keyof ReelBoardColumns].push(reel);
  }

  return {
    success: true,
    board: {
      columns,
      count: reels.length,
    },
  };
}

export async function createReel(
  supabase: ReelSupabaseClient,
  userId: string,
  input: CreateReelInput,
): Promise<ReelSuccess | ServiceFailure> {
  const { data, error } = await insertReel(supabase, userId, {
    idea: input.idea,
    status: REEL_BOARD_DEFAULT_STATUS,
  });

  if (error || !data) {
    return {
      success: false,
      error: "CREATION_FAILED",
      message: getErrorMessage(error, "Unable to create reel"),
    };
  }

  return {
    success: true,
    reel: data as ReelRow,
  };
}

export async function updateReel(
  supabase: ReelSupabaseClient,
  userId: string,
  reelId: string,
  input: UpdateReelInput,
): Promise<ReelSuccess | ServiceFailure> {
  const { data, error } = await updateReelById(supabase, userId, reelId, input);

  if (error) {
    return {
      success: false,
      error: "UPDATE_FAILED",
      message: getErrorMessage(error, "Unable to update reel"),
    };
  }

  if (!data) {
    return {
      success: false,
      error: "NOT_FOUND",
      message: "Reel not found",
    };
  }

  return {
    success: true,
    reel: data as ReelRow,
  };
}

export async function updateReelStatus(
  supabase: ReelSupabaseClient,
  userId: string,
  reelId: string,
  input: UpdateReelStatusInput,
): Promise<ReelSuccess | ServiceFailure> {
  const { data, error } = await updateReelById(supabase, userId, reelId, {
    status: input.status,
  });

  if (error) {
    return {
      success: false,
      error: "UPDATE_FAILED",
      message: getErrorMessage(error, "Unable to update reel status"),
    };
  }

  if (!data) {
    return {
      success: false,
      error: "NOT_FOUND",
      message: "Reel not found",
    };
  }

  return {
    success: true,
    reel: data as ReelRow,
  };
}

export async function deleteReel(
  supabase: ReelSupabaseClient,
  userId: string,
  reelId: string,
): Promise<DeleteSuccess | ServiceFailure> {
  const { data, error } = await deleteReelById(supabase, userId, reelId);

  if (error) {
    return {
      success: false,
      error: "DELETE_FAILED",
      message: getErrorMessage(error, "Unable to delete reel"),
    };
  }

  if (!data) {
    return {
      success: false,
      error: "NOT_FOUND",
      message: "Reel not found",
    };
  }

  return {
    success: true,
    reelId,
  };
}
