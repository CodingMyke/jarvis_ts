import { NextRequest } from "next/server";
import { getAuthContext, jsonError } from "@/app/_server";
import { getReelBoardUnauthorizedResponse, handleGenerateReelField } from "@/app/_features/academy";

function getRouteError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

async function withAuth() {
  const auth = await getAuthContext();
  return auth ?? getReelBoardUnauthorizedResponse();
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ reelId: string; field: string }> },
) {
  try {
    const authOrResponse = await withAuth();

    if (authOrResponse instanceof Response) {
      return authOrResponse;
    }

    const { reelId, field } = await context.params;
    return await handleGenerateReelField(authOrResponse, reelId, field);
  } catch (error) {
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message: getRouteError(error),
    });
  }
}

