import type { AuthContext } from "@/app/_server/http/auth";
import { jsonError, jsonOk } from "@/app/_server/http/responses";
import { getZodErrorMessage } from "@/app/_server/http/zod";
import { userSettingsPatchBodySchema } from "./user-settings-route.schemas";
import {
  ensureUserSettings,
  getUserSettings,
  updateUserSettings,
} from "./user-settings.service";

export function getUserSettingsUnauthorizedResponse() {
  return jsonError(401, {
    error: "UNAUTHORIZED",
    message: "User is not authenticated.",
  });
}

function toServiceErrorResponse(result: { error: string; message: string }) {
  const status = result.error === "NOT_FOUND" ? 404 : 500;

  return jsonError(status, {
    error: result.error,
    message: result.message,
  });
}

export async function handleGetUserSettings(auth: AuthContext) {
  const result = await getUserSettings(auth.supabase, auth.userId);

  if (!result.success) {
    return toServiceErrorResponse(result);
  }

  return jsonOk({
    success: true,
    settings: result.settings,
  });
}

export async function handleEnsureUserSettings(auth: AuthContext, body: unknown) {
  const parsedPatch = userSettingsPatchBodySchema.safeParse(body ?? {});

  if (!parsedPatch.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      message: getZodErrorMessage(parsedPatch.error),
    });
  }

  const ensured = await ensureUserSettings(
    auth.supabase,
    auth.userId,
    parsedPatch.data.timezone,
  );

  if (!ensured.success) {
    return toServiceErrorResponse(ensured);
  }

  return jsonOk({
    success: true,
    settings: ensured.settings,
  });
}

export async function handlePatchUserSettings(auth: AuthContext, body: unknown) {
  const parsedPatch = userSettingsPatchBodySchema.safeParse(body ?? {});

  if (!parsedPatch.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      message: getZodErrorMessage(parsedPatch.error),
    });
  }

  const updated = await updateUserSettings(auth.supabase, auth.userId, parsedPatch.data);

  if (!updated.success) {
    return toServiceErrorResponse(updated);
  }

  return jsonOk({
    success: true,
    settings: updated.settings,
  });
}
