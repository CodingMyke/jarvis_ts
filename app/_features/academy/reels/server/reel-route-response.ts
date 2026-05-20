import type { ZodError } from "zod";
import { jsonError, jsonOk } from "@/app/_server/http/responses";
import { reelBoardSchema, reelSchema } from "../lib/reel-board.schemas";

function logValidationError(scope: string, error: ZodError, payload: unknown) {
  console.error(`[academy-reels] Invalid ${scope} response payload`, {
    issues: error.issues,
    payload,
  });
}

export function jsonValidatedReel(payload: { success: true; reel: unknown }) {
  const parsed = reelSchema.safeParse(payload.reel);

  if (!parsed.success) {
    logValidationError("reel", parsed.error, payload.reel);

    return jsonError(500, {
      error: "INVALID_RESPONSE_PAYLOAD",
      message: "Reel response payload is invalid",
    });
  }

  return jsonOk({
    success: true,
    reel: parsed.data,
  });
}

export function jsonValidatedBoard(payload: { success: true; board: unknown }) {
  const parsed = reelBoardSchema.safeParse(payload.board);

  if (!parsed.success) {
    logValidationError("board", parsed.error, payload.board);

    return jsonError(500, {
      error: "INVALID_RESPONSE_PAYLOAD",
      message: "Reel board response payload is invalid",
    });
  }

  return jsonOk({
    success: true,
    board: parsed.data,
  });
}
