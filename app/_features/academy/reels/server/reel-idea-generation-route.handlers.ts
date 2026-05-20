import type { AuthContext } from "@/app/_server/http/auth";
import { jsonError, jsonOk } from "@/app/_server/http/responses";
import { getZodErrorMessage } from "@/app/_server/http/zod";
import { reelIdeaGenerationTriggerBodySchema } from "./reel-idea-generation-route.schemas";
import { triggerManualReelIdeaGeneration } from "./reel-idea-generation.service";

function toServiceErrorResponse(result: { error: string; message: string }) {
  const status = result.error === "FLOW_ALREADY_RUNNING" ? 409 : 500;
  return jsonError(status, {
    error: result.error,
    message: result.message,
  });
}

export async function handleTriggerManualReelIdeaGeneration(
  auth: AuthContext,
  body: unknown = {},
) {
  const parsedBody = reelIdeaGenerationTriggerBodySchema.safeParse(body ?? {});

  if (!parsedBody.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      message: getZodErrorMessage(parsedBody.error),
    });
  }

  const result = await triggerManualReelIdeaGeneration(auth.supabase, {
    userId: auth.userId,
  });

  if (!result.success) {
    return toServiceErrorResponse(result);
  }

  return jsonOk(result);
}
