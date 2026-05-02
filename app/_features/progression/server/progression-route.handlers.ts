import { jsonError, jsonOk } from "@/app/_server/http/responses";
import { getZodErrorMessage } from "@/app/_server/http/zod";
import type { AuthContext } from "@/app/_server/http/auth";
import {
  completeProgressionGoal,
  createProgressionCheckin,
  createProgressionGoal,
  duplicateProgressionGoal,
  ensureProgressionProfile,
  getProgressionGoalDetails,
  getProgressionOverview,
  getProgressionStatus,
  getProgressionXpHistory,
  resolveExpiredProgressionGoal,
  softDeleteProgressionGoal,
  startProgressionGoal,
  undoProgressionCheckin,
  updateProgressionGoal,
} from "./progression.service";
import {
  progressionCheckinCreateBodySchema,
  progressionCheckinUndoBodySchema,
  progressionDeadlineReviewBodySchema,
  progressionGoalCreateBodySchema,
  progressionGoalDeleteBodySchema,
  progressionGoalDetailsQuerySchema,
  progressionGoalOperationBodySchema,
  progressionGoalUpdateBodySchema,
  progressionOverviewQuerySchema,
  progressionProfileBodySchema,
  progressionStatusBodySchema,
  progressionXpHistoryQuerySchema,
} from "./progression-route.schemas";

export function getProgressionUnauthorizedResponse() {
  return jsonError(401, {
    error: "UNAUTHORIZED",
    message: "User is not authenticated.",
  });
}

export async function handleGetProgressionOverview(
  auth: AuthContext,
  searchParams: URLSearchParams,
) {
  const parsed = progressionOverviewQuerySchema.safeParse({
    status: searchParams.get("status") ?? undefined,
    today: searchParams.get("today") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_QUERY",
      message: getZodErrorMessage(parsed.error),
    });
  }

  const result = await getProgressionOverview(auth.supabase, auth.userId, parsed.data);
  if (!result.success) {
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message: result.error,
    });
  }

  return jsonOk({
    success: true,
    overview: result.overview,
  });
}

export async function handleGetProgressionGoalDetails(
  auth: AuthContext,
  searchParams: URLSearchParams,
) {
  const parsed = progressionGoalDetailsQuerySchema.safeParse({
    id: searchParams.get("id") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_QUERY",
      message: getZodErrorMessage(parsed.error),
    });
  }

  const result = await getProgressionGoalDetails(auth.supabase, auth.userId, parsed.data.id);
  if (!result.success) {
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message: result.error,
    });
  }

  return jsonOk({
    success: true,
    goal: result.details.goal,
    actions: result.details.actions,
  });
}

export async function handleEnsureProgressionProfile(auth: AuthContext, body: unknown) {
  const parsed = progressionProfileBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      message: getZodErrorMessage(parsed.error),
    });
  }

  const result = await ensureProgressionProfile(auth.supabase, parsed.data.timezone);
  if (!result.success) {
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message: result.error,
    });
  }

  return jsonOk({
    success: true,
    profile: result.profile,
  });
}

export async function handleGetProgressionStatus(auth: AuthContext, body: unknown) {
  const parsed = progressionStatusBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      message: getZodErrorMessage(parsed.error),
    });
  }

  const result = await getProgressionStatus(auth.supabase, auth.userId, parsed.data.timezone);
  if (!result.success) {
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message: result.error,
    });
  }

  return jsonOk({
    success: true,
    status: result.status,
  });
}

export async function handleGetProgressionGoals(
  auth: AuthContext,
  searchParams: URLSearchParams,
) {
  return handleGetProgressionGoalDetails(auth, searchParams);
}

export async function handleCreateProgressionGoal(auth: AuthContext, body: unknown) {
  const parsed = progressionGoalCreateBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      message: getZodErrorMessage(parsed.error),
    });
  }

  const result = await createProgressionGoal(auth.supabase, auth.userId, parsed.data);
  if (!result.success) {
    return jsonError(500, {
      error: "CREATION_FAILED",
      message: result.error,
    });
  }

  return jsonOk({
    success: true,
    goal: result.goal,
    actions: result.actions,
  });
}

async function handleProgressionGoalOperation(auth: AuthContext, body: unknown) {
  const parsed = progressionGoalOperationBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      message: getZodErrorMessage(parsed.error),
    });
  }

  const { goalId, operation } = parsed.data;
  const result = operation === "start"
    ? await startProgressionGoal(auth.supabase, auth.userId, goalId)
    : operation === "complete"
      ? await completeProgressionGoal(auth.supabase, auth.userId, goalId)
      : operation === "duplicate"
        ? await duplicateProgressionGoal(auth.supabase, auth.userId, goalId)
        : await resolveExpiredProgressionGoal(auth.supabase, auth.userId, {
            goalId,
            action: "fail",
          });

  if (!result.success) {
    return jsonError(500, {
      error: "UPDATE_FAILED",
      message: result.error,
    });
  }

  return jsonOk(result);
}

export async function handleUpdateProgressionGoal(auth: AuthContext, body: unknown) {
  if (typeof body === "object" && body !== null && "operation" in body) {
    return handleProgressionGoalOperation(auth, body);
  }

  const parsed = progressionGoalUpdateBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      message: getZodErrorMessage(parsed.error),
    });
  }

  const result = await updateProgressionGoal(auth.supabase, auth.userId, parsed.data);
  if (!result.success) {
    return jsonError(500, {
      error: "UPDATE_FAILED",
      message: result.error,
    });
  }

  return jsonOk({
    success: true,
    goal: result.goal,
  });
}

export async function handleDeleteProgressionGoal(
  auth: AuthContext,
  body: unknown,
  searchParams: URLSearchParams,
) {
  const rawBody = typeof body === "object" && body !== null ? body : {};
  const parsed = progressionGoalDeleteBodySchema.safeParse({
    ...rawBody,
    id: (
      typeof rawBody === "object"
      && rawBody !== null
      && "id" in rawBody
      && typeof rawBody.id === "string"
    ) ? rawBody.id : (searchParams.get("id") ?? undefined),
  });

  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      message: getZodErrorMessage(parsed.error),
    });
  }

  const result = await softDeleteProgressionGoal(auth.supabase, auth.userId, parsed.data.id);
  if (!result.success) {
    return jsonError(500, {
      error: "DELETE_FAILED",
      message: result.error,
    });
  }

  return jsonOk({
    success: true,
    goal: result.goal,
  });
}

export async function handleCreateProgressionCheckin(auth: AuthContext, body: unknown) {
  const parsed = progressionCheckinCreateBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      message: getZodErrorMessage(parsed.error),
    });
  }

  const result = await createProgressionCheckin(auth.supabase, auth.userId, parsed.data.actionId);
  if (!result.success) {
    return jsonError(500, {
      error: "CREATION_FAILED",
      message: result.error,
    });
  }

  return jsonOk({
    success: true,
    checkin: result.checkin,
  });
}

export async function handleUndoProgressionCheckin(
  auth: AuthContext,
  body: unknown,
  searchParams: URLSearchParams,
) {
  const rawBody = typeof body === "object" && body !== null ? body : {};
  const parsed = progressionCheckinUndoBodySchema.safeParse({
    ...rawBody,
    checkinId: (
      typeof rawBody === "object"
      && rawBody !== null
      && "checkinId" in rawBody
      && typeof rawBody.checkinId === "string"
    ) ? rawBody.checkinId : (searchParams.get("id") ?? undefined),
  });

  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      message: getZodErrorMessage(parsed.error),
    });
  }

  const result = await undoProgressionCheckin(auth.supabase, auth.userId, parsed.data.checkinId);
  if (!result.success) {
    return jsonError(500, {
      error: "DELETE_FAILED",
      message: result.error,
    });
  }

  return jsonOk({
    success: true,
    checkin: result.checkin,
  });
}

export async function handleGetProgressionDeadlines(auth: AuthContext) {
  const result = await getProgressionOverview(auth.supabase, auth.userId, {});
  if (!result.success) {
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message: result.error,
    });
  }

  return jsonOk({
    success: true,
    deadlineWarning: result.overview.deadlineWarning,
    expiredGoals: result.overview.expiredGoals,
    count: result.overview.expiredGoals.length,
  });
}

export async function handleResolveProgressionDeadline(auth: AuthContext, body: unknown) {
  const parsed = progressionDeadlineReviewBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      message: getZodErrorMessage(parsed.error),
    });
  }

  const result = await resolveExpiredProgressionGoal(auth.supabase, auth.userId, parsed.data);
  if (!result.success) {
    return jsonError(500, {
      error: "UPDATE_FAILED",
      message: result.error,
    });
  }

  return jsonOk({
    success: true,
    goal: result.goal,
  });
}

export async function handleGetProgressionXpHistory(
  auth: AuthContext,
  searchParams: URLSearchParams,
) {
  const parsed = progressionXpHistoryQuerySchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_QUERY",
      message: getZodErrorMessage(parsed.error),
    });
  }

  const result = await getProgressionXpHistory(auth.supabase, auth.userId, parsed.data);
  if (!result.success) {
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message: result.error,
    });
  }

  return jsonOk({
    success: true,
    history: result.history,
    count: result.history.length,
  });
}
