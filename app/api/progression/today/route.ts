import { getAuthContext, jsonError } from "@/app/_server";
import {
  getProgressionUnauthorizedResponse,
  handleGetProgressionToday,
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

    return await handleGetProgressionToday(auth);
  } catch (error) {
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message: getRouteError(error),
    });
  }
}
