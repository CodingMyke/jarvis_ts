import { NextRequest } from "next/server";
import { getAuthContext, jsonError } from "@/app/_server";
import {
  handleEnsureUserSettings,
  getUserSettingsUnauthorizedResponse,
  handleGetUserSettings,
  handlePatchUserSettings,
} from "@/app/_features/user-settings";

function getRouteError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return getUserSettingsUnauthorizedResponse();
    }

    return await handleGetUserSettings(auth);
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
      return getUserSettingsUnauthorizedResponse();
    }

    const body = await request.json();
    return await handlePatchUserSettings(auth, body);
  } catch (error) {
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message: getRouteError(error),
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return getUserSettingsUnauthorizedResponse();
    }

    const body = await request.json().catch(() => ({}));
    return await handleEnsureUserSettings(auth, body);
  } catch (error) {
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message: getRouteError(error),
    });
  }
}
