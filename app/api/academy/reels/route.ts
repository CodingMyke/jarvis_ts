import { NextRequest } from "next/server";
import { getAuthContext, jsonError } from "@/app/_server";
import {
  getReelBoardUnauthorizedResponse,
  handleCreateReel,
  handleGetReelBoard,
} from "@/app/_features/academy";

function getRouteError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

async function withAuth() {
  const auth = await getAuthContext();
  return auth ?? getReelBoardUnauthorizedResponse();
}

export async function GET() {
  try {
    const authOrResponse = await withAuth();

    if (authOrResponse instanceof Response) {
      return authOrResponse;
    }

    return await handleGetReelBoard(authOrResponse);
  } catch (error) {
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message: getRouteError(error),
    });
  }
}

export async function POST(request: NextRequest) {
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

    return await handleCreateReel(authOrResponse, body);
  } catch (error) {
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message: getRouteError(error),
    });
  }
}
