import type { AuthContext } from "@/app/_server/http/auth";
import { jsonError, jsonOk } from "@/app/_server/http/responses";
import { getZodErrorMessage } from "@/app/_server/http/zod";
import { reelFieldParamsSchema, reelIdParamsSchema } from "./reel-generation-route.schemas";
import { generateReelField, generateReelFields } from "./reel-generation.service";

function toServiceErrorResponse(result: { error: string; message: string }) {
  const status = result.error === "NOT_FOUND" ? 404 : 500;
  return jsonError(status, {
    error: result.error,
    message: result.message,
  });
}

export async function handleGenerateReelFields(auth: AuthContext, reelId: string) {
  const parsedReelId = reelIdParamsSchema.safeParse({ reelId });

  if (!parsedReelId.success) {
    return jsonError(400, {
      error: "INVALID_PARAMS",
      message: getZodErrorMessage(parsedReelId.error),
    });
  }

  const result = await generateReelFields(auth.supabase, auth.userId, parsedReelId.data.reelId);

  if (!result.success) {
    return toServiceErrorResponse(result);
  }

  return jsonOk({ success: true });
}

export async function handleGenerateReelField(auth: AuthContext, reelId: string, field: string) {
  const parsedReelId = reelIdParamsSchema.safeParse({ reelId });

  if (!parsedReelId.success) {
    return jsonError(400, {
      error: "INVALID_PARAMS",
      message: getZodErrorMessage(parsedReelId.error),
    });
  }

  const parsedField = reelFieldParamsSchema.safeParse({ field });

  if (!parsedField.success) {
    return jsonError(400, {
      error: "INVALID_PARAMS",
      message: getZodErrorMessage(parsedField.error),
    });
  }

  const result = await generateReelField(
    auth.supabase,
    auth.userId,
    parsedReelId.data.reelId,
    parsedField.data.field,
  );

  if (!result.success) {
    return toServiceErrorResponse(result);
  }

  return jsonOk({ success: true });
}

