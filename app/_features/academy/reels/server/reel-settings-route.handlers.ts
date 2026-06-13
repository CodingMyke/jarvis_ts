import type { AuthContext } from "@/app/_server/http/auth";
import { jsonError, jsonOk } from "@/app/_server/http/responses";
import { getZodErrorMessage } from "@/app/_server/http/zod";
import { reelSettingsPatchBodySchema } from "./reel-settings-route.schemas";
import { getReelAutomationSettings, updateReelAutomationSettings } from "./reel-settings.service";

function toServiceErrorResponse(result: { error: string; message: string }) {
  return jsonError(500, {
    error: result.error,
    message: result.message,
  });
}

export async function handleGetReelAutomationSettings(auth: AuthContext) {
  const result = await getReelAutomationSettings(auth.supabase, auth.userId);

  if (!result.success) {
    return toServiceErrorResponse(result);
  }

  return jsonOk({
    success: true,
    settings: result.settings,
  });
}

export async function handlePatchReelAutomationSettings(auth: AuthContext, body: unknown) {
  const parsedPatch = reelSettingsPatchBodySchema.safeParse(body ?? {});

  if (!parsedPatch.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      message: getZodErrorMessage(parsedPatch.error),
    });
  }

  const current = await getReelAutomationSettings(auth.supabase, auth.userId);

  if (!current.success) {
    return toServiceErrorResponse(current);
  }

  const merged = {
    ...current.settings,
    ...parsedPatch.data,
  };

  const updated = await updateReelAutomationSettings(auth.supabase, auth.userId, merged);

  if (!updated.success) {
    return toServiceErrorResponse(updated);
  }

  return jsonOk({
    success: true,
    settings: updated.settings,
  });
}

