import { NextRequest } from "next/server";
import { getAuthContext, jsonError } from "@/app/_server";
import {
  getProgressionUnauthorizedResponse,
  handleGetProgressionXpHistory,
} from "@/app/_features/progression";

function getRouteError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return getProgressionUnauthorizedResponse();
    }

    return await handleGetProgressionXpHistory(auth, request.nextUrl.searchParams);
  } catch (error) {
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message: getRouteError(error),
    });
  }
}
