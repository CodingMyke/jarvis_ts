import { NextRequest } from "next/server";
import { getAuthContext, jsonError } from "@/app/_server";
import {
  getProgressionUnauthorizedResponse,
  handleCreateProgressionGoal,
  handleDeleteProgressionGoal,
  handleGetProgressionGoals,
  handleUpdateProgressionGoal,
} from "@/app/_features/progression";

function getRouteError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

async function readOptionalJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return getProgressionUnauthorizedResponse();
    }

    return await handleGetProgressionGoals(auth, request.nextUrl.searchParams);
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
      return getProgressionUnauthorizedResponse();
    }

    return await handleCreateProgressionGoal(auth, await request.json());
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

    return await handleUpdateProgressionGoal(auth, await request.json());
  } catch (error) {
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message: getRouteError(error),
    });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return getProgressionUnauthorizedResponse();
    }

    return await handleDeleteProgressionGoal(
      auth,
      await readOptionalJson(request),
      request.nextUrl.searchParams,
    );
  } catch (error) {
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message: getRouteError(error),
    });
  }
}
