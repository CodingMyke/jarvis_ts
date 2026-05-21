import { NextRequest } from "next/server";
import { getAuthContext, jsonError } from "@/app/_server";
import {
  getReelBoardUnauthorizedResponse,
  handleDeleteReel,
  handleUpdateReel,
} from "@/app/_features/academy";

function getRouteError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

async function withAuth() {
  const auth = await getAuthContext();
  return auth ?? getReelBoardUnauthorizedResponse();
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ reelId: string }> },
) {
  try {
    const authOrResponse = await withAuth();

    if (authOrResponse instanceof Response) {
      return authOrResponse;
    }

    let body: unknown = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const { reelId } = await context.params;
    return await handleUpdateReel(authOrResponse, reelId, body);
  } catch (error) {
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message: getRouteError(error),
    });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ reelId: string }> },
) {
  try {
    const authOrResponse = await withAuth();

    if (authOrResponse instanceof Response) {
      return authOrResponse;
    }

    const { reelId } = await context.params;
    return await handleDeleteReel(authOrResponse, reelId);
  } catch (error) {
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message: getRouteError(error),
    });
  }
}
