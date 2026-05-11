import type { AuthContext } from "@/app/_server/http/auth";
import { jsonError, jsonOk } from "@/app/_server/http/responses";
import { getZodErrorMessage } from "@/app/_server/http/zod";
import {
  createReel,
  deleteReel,
  getReelBoard,
  updateReel,
  updateReelStatus,
} from "./reel-board.service";
import {
  reelCreateBodySchema,
  reelIdParamsSchema,
  reelUpdateBodySchema,
  reelUpdateStatusBodySchema,
} from "./reel-board-route.schemas";

function toServiceErrorResponse(result: { error: string; message: string }) {
  return jsonError(result.error === "NOT_FOUND" ? 404 : 500, {
    error: result.error,
    message: result.message,
  });
}

function parseReelId(reelId: string) {
  return reelIdParamsSchema.safeParse({ reelId });
}

export function getReelBoardUnauthorizedResponse() {
  return jsonError(401, {
    error: "UNAUTHORIZED",
    message: "User is not authenticated",
  });
}

export async function handleGetReelBoard(auth: AuthContext) {
  const result = await getReelBoard(auth.supabase, auth.userId);

  if (!result.success) {
    return toServiceErrorResponse(result);
  }

  return jsonOk({
    success: true,
    board: result.board,
  });
}

export async function handleCreateReel(auth: AuthContext, body: unknown) {
  const parsed = reelCreateBodySchema.safeParse(body ?? {});

  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      message: getZodErrorMessage(parsed.error),
    });
  }

  const result = await createReel(auth.supabase, auth.userId, parsed.data);

  if (!result.success) {
    return toServiceErrorResponse(result);
  }

  return jsonOk({
    success: true,
    reel: result.reel,
  });
}

export async function handleUpdateReel(auth: AuthContext, reelId: string, body: unknown) {
  const parsedReelId = parseReelId(reelId);

  if (!parsedReelId.success) {
    return jsonError(400, {
      error: "INVALID_PARAMS",
      message: getZodErrorMessage(parsedReelId.error),
    });
  }

  const parsedBody = reelUpdateBodySchema.safeParse(body ?? {});

  if (!parsedBody.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      message: getZodErrorMessage(parsedBody.error),
    });
  }

  const result = await updateReel(auth.supabase, auth.userId, parsedReelId.data.reelId, parsedBody.data);

  if (!result.success) {
    return toServiceErrorResponse(result);
  }

  return jsonOk({
    success: true,
    reel: result.reel,
  });
}

export async function handleUpdateReelStatus(auth: AuthContext, reelId: string, body: unknown) {
  const parsedReelId = parseReelId(reelId);

  if (!parsedReelId.success) {
    return jsonError(400, {
      error: "INVALID_PARAMS",
      message: getZodErrorMessage(parsedReelId.error),
    });
  }

  const parsedBody = reelUpdateStatusBodySchema.safeParse(body ?? {});

  if (!parsedBody.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      message: getZodErrorMessage(parsedBody.error),
    });
  }

  const result = await updateReelStatus(
    auth.supabase,
    auth.userId,
    parsedReelId.data.reelId,
    parsedBody.data,
  );

  if (!result.success) {
    return toServiceErrorResponse(result);
  }

  return jsonOk({
    success: true,
    reel: result.reel,
  });
}

export async function handleDeleteReel(auth: AuthContext, reelId: string) {
  const parsedReelId = parseReelId(reelId);

  if (!parsedReelId.success) {
    return jsonError(400, {
      error: "INVALID_PARAMS",
      message: getZodErrorMessage(parsedReelId.error),
    });
  }

  const result = await deleteReel(auth.supabase, auth.userId, parsedReelId.data.reelId);

  if (!result.success) {
    return toServiceErrorResponse(result);
  }

  return jsonOk({
    success: true,
    deleted: true,
    reelId: result.reelId,
  });
}
