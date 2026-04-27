import { NextRequest } from "next/server";
import { getAuthContext, jsonError } from "@/app/_server";
import {
  getProgressionUnauthorizedResponse,
  handleGetProgressionDeadlines,
  handleResolveProgressionDeadline,
} from "@/app/_features/progression";

function getRouteError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return getProgressionUnauthorizedResponse();
    }

    return await handleGetProgressionDeadlines(auth);
  } catch (error) {
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message: getRouteError(error),
    });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return getProgressionUnauthorizedResponse();
    }

    return await handleResolveProgressionDeadline(auth, await request.json());
  } catch (error) {
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message: getRouteError(error),
    });
  }
}
