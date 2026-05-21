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
  getReelById,
  insertReel,
  insertTransitionEvent,
  listReelsByUser,
  saveRejectedIdeaSnapshot,
  updateReelById,
} from "./reel-board.repository";

type ReelSupabaseClient = SupabaseClient<Database>;
type TransitionAction = "approve_ai_idea" | "manual_move";
type ServiceErrorCode =
  | "CREATION_FAILED"
  | "DELETE_FAILED"
  | "IMMUTABLE_FIELD"
  | "INVALID_STATUS_TRANSITION"
  | "LIST_FAILED"
  | "NOT_FOUND"
  | "UPDATE_FAILED";

interface ServiceFailure {
  success: false;
  error: ServiceErrorCode;
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

function isServiceFailure(value: ReelRow | ServiceFailure): value is ServiceFailure {
  return "success" in value;
}

async function getCurrentReel(
  supabase: ReelSupabaseClient,
  userId: string,
  reelId: string,
  failureCode: Extract<ServiceErrorCode, "DELETE_FAILED" | "UPDATE_FAILED">,
  fallbackMessage: string,
): Promise<ReelRow | ServiceFailure> {
  const { data, error } = await getReelById(supabase, userId, reelId);

  if (error) {
    return {
      success: false,
      error: failureCode,
      message: getErrorMessage(error, fallbackMessage),
    };
  }

  if (!data) {
    return {
      success: false,
      error: "NOT_FOUND",
      message: "Reel not found",
    };
  }

  return data as ReelRow;
}

function buildPublishedAtPatch(current: ReelRow, nextStatus: ReelRow["status"]): string | null {
  if (current.status !== "published" && nextStatus === "published") {
    return new Date().toISOString();
  }

  if (current.status === "published" && nextStatus !== "published") {
    return null;
  }

  return current.published_at;
}

async function recordTransitionIfNeeded(
  supabase: ReelSupabaseClient,
  current: ReelRow,
  userId: string,
  reelId: string,
  nextStatus: ReelRow["status"],
  action: TransitionAction,
): Promise<ServiceFailure | null> {
  if (current.status !== "ai_idea" || nextStatus === "ai_idea") {
    return null;
  }

  const { error } = await insertTransitionEvent(supabase, {
    user_id: userId,
    reel_id: reelId,
    from_status: current.status,
    to_status: nextStatus,
    action,
    metadata: {
      origin: current.origin,
    },
  });

  if (error) {
    return {
      success: false,
      error: "UPDATE_FAILED",
      message: getErrorMessage(error, "Unable to record reel transition"),
    };
  }

  return null;
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
  if ("origin" in input) {
    return {
      success: false,
      error: "IMMUTABLE_FIELD",
      message: "origin cannot be changed",
    };
  }

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
  if (input.status === "ai_idea") {
    return {
      success: false,
      error: "INVALID_STATUS_TRANSITION",
      message: "Only Reel Idea Generation may place reels in ai_idea",
    };
  }

  const current = await getCurrentReel(
    supabase,
    userId,
    reelId,
    "UPDATE_FAILED",
    "Unable to load reel",
  );

  if (isServiceFailure(current)) {
    return current;
  }

  const transitionError = await recordTransitionIfNeeded(
    supabase,
    current,
    userId,
    reelId,
    input.status,
    "manual_move",
  );

  if (transitionError) {
    return transitionError;
  }

  const { data, error } = await updateReelById(supabase, userId, reelId, {
    status: input.status,
    published_at: buildPublishedAtPatch(current, input.status),
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
  const current = await getCurrentReel(
    supabase,
    userId,
    reelId,
    "DELETE_FAILED",
    "Unable to load reel",
  );

  if (isServiceFailure(current)) {
    return current;
  }

  if (current.status === "ai_idea") {
    const { error: snapshotError } = await saveRejectedIdeaSnapshot(supabase, {
      user_id: userId,
      reel_id: current.id,
      run_id: current.last_idea_generation_run_id,
      origin: current.origin,
      idea: current.idea,
      title: current.title,
      caption: current.caption,
      body: current.body,
      hashtags: current.hashtags,
      notes: current.notes,
    });

    if (snapshotError) {
      return {
        success: false,
        error: "DELETE_FAILED",
        message: getErrorMessage(snapshotError, "Unable to persist rejected idea"),
      };
    }
  }

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

export async function approveAiIdea(
  supabase: ReelSupabaseClient,
  userId: string,
  reelId: string,
  input: UpdateReelInput,
): Promise<ReelSuccess | ServiceFailure> {
  const current = await getCurrentReel(
    supabase,
    userId,
    reelId,
    "UPDATE_FAILED",
    "Unable to load reel",
  );

  if (isServiceFailure(current)) {
    return current;
  }

  const transitionError = await recordTransitionIfNeeded(
    supabase,
    current,
    userId,
    reelId,
    "idea",
    "approve_ai_idea",
  );

  if (transitionError) {
    return transitionError;
  }

  const { data, error } = await updateReelById(supabase, userId, reelId, {
    status: "idea",
    idea: input.idea,
    title: input.title,
    caption: input.caption,
    body: input.body,
    hashtags: input.hashtags,
    notes: input.notes,
    scheduled_at: input.scheduled_at,
    published_at: buildPublishedAtPatch(current, "idea"),
  });

  if (error) {
    return {
      success: false,
      error: "UPDATE_FAILED",
      message: getErrorMessage(error, "Unable to approve ai idea"),
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
