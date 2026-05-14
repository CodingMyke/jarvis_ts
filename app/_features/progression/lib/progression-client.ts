import type {
  ProgressionDeadlineReviewInput,
  ProgressionGoalCreateInput,
  ProgressionGoalOperationInput,
  ProgressionGoalUpdateInput,
} from "../server/progression-route.schemas";
import type { ProgressionStatus } from "../server/progression.types";

export interface ProgressionOperationError {
  success: false;
  error: string;
  errorMessage: string;
  status?: number;
}

export interface ProgressionOverviewResponse {
  profile?: unknown;
  goals?: unknown[];
  todayItems?: unknown[];
  weeklyItems?: unknown[];
  expiredGoals?: unknown[];
  xpHistory?: unknown[];
  todayLocalDate?: string;
  deadlineWarning?: boolean;
  [key: string]: unknown;
}

export interface ProgressionGoalDetailsResponse {
  goal?: unknown;
  actions?: unknown[];
}

export interface ProgressionLevelResponse {
  profile?: unknown;
  levelProgress?: unknown;
}

export interface ProgressionTodayResponse {
  todayItems?: unknown[];
  weeklyItems?: unknown[];
  todayLocalDate?: string;
  timezone?: string;
}

export interface ProgressionStatusResponse {
  status?: ProgressionStatus;
}

export type ProgressionClientResult<T extends object> =
  | ({ success: true } & T)
  | ProgressionOperationError;

interface ProgressionApiResponse {
  success?: boolean;
  status?: ProgressionStatus;
  overview?: ProgressionOverviewResponse;
  level?: ProgressionLevelResponse;
  today?: ProgressionTodayResponse;
  goals?: unknown[];
  profile?: unknown;
  goal?: unknown;
  actions?: unknown[];
  checkin?: unknown;
  history?: unknown[];
  count?: number;
  error?: string;
  message?: string;
  errorMessage?: string;
}

function getErrorMessage(response: ProgressionApiResponse | null, fallback: string): string {
  return response?.errorMessage ?? response?.message ?? response?.error ?? fallback;
}

function toOperationError(
  response: ProgressionApiResponse | null,
  fallbackError: string,
  fallbackMessage: string,
  status?: number,
): ProgressionOperationError {
  return {
    success: false,
    error: response?.error ?? fallbackError,
    errorMessage: getErrorMessage(response, fallbackMessage),
    status,
  };
}

function toUnexpectedError(error: unknown, fallbackMessage: string): ProgressionOperationError {
  return {
    success: false,
    error: "EXECUTION_ERROR",
    errorMessage: error instanceof Error ? error.message : fallbackMessage,
  };
}

async function parseProgressionResponse(response: Response): Promise<ProgressionApiResponse | null> {
  return (await response.json().catch(() => null)) as ProgressionApiResponse | null;
}

function jsonRequest(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

async function runProgressionRequest<T extends object>(
  request: Promise<Response>,
  validate: (data: ProgressionApiResponse) => T | null,
  fallbackError: string,
  fallbackMessage: string,
): Promise<ProgressionClientResult<T>> {
  try {
    const response = await request;
    const data = await parseProgressionResponse(response);

    if (!response.ok || !data?.success) {
      return toOperationError(data, fallbackError, `HTTP ${response.status}`, response.status);
    }

    const normalized = validate(data);
    if (!normalized) {
      return toOperationError(data, fallbackError, fallbackMessage, response.status);
    }

    return { success: true, ...normalized };
  } catch (error) {
    return toUnexpectedError(error, fallbackMessage);
  }
}

export async function getProgressionOverview(): Promise<
  ProgressionClientResult<{ overview: ProgressionOverviewResponse }>
> {
  return runProgressionRequest(
    fetch("/api/progression"),
    (data) => data.overview ? { overview: data.overview } : null,
    "GET_PROGRESSION_FAILED",
    "Progression overview response is invalid.",
  );
}

export async function getProgressionLevel(): Promise<
  ProgressionClientResult<{ level: ProgressionLevelResponse }>
> {
  return runProgressionRequest(
    fetch("/api/progression/level"),
    (data) => data.level ? { level: data.level } : null,
    "GET_PROGRESSION_LEVEL_FAILED",
    "Progression level response is invalid.",
  );
}

export async function getProgressionToday(): Promise<
  ProgressionClientResult<{ today: ProgressionTodayResponse }>
> {
  return runProgressionRequest(
    fetch("/api/progression/today"),
    (data) => data.today ? { today: data.today } : null,
    "GET_PROGRESSION_TODAY_FAILED",
    "Progression today response is invalid.",
  );
}

export async function getProgressionGoals(): Promise<
  ProgressionClientResult<{ goals: unknown[] }>
> {
  return runProgressionRequest(
    fetch("/api/progression/goals"),
    (data) => ({ goals: Array.isArray(data.goals) ? data.goals : [] }),
    "GET_PROGRESSION_GOALS_FAILED",
    "Progression goals response is invalid.",
  );
}

export async function getProgressionStatus(
): Promise<ProgressionClientResult<ProgressionStatusResponse>> {
  return runProgressionRequest(
    fetch("/api/progression/status"),
    (data) => data.status ? { status: data.status } : null,
    "GET_PROGRESSION_STATUS_FAILED",
    "Progression status response is invalid.",
  );
}

export async function getProgressionGoalDetails(
  id: string,
): Promise<ProgressionClientResult<ProgressionGoalDetailsResponse>> {
  return runProgressionRequest(
    fetch(`/api/progression/goals?id=${encodeURIComponent(id)}`),
    (data) => (data.goal !== undefined ? { goal: data.goal, actions: data.actions ?? [] } : null),
    "GOAL_DETAILS_LOAD_FAILED",
    "Progression goal details response is invalid.",
  );
}

export async function ensureProgressionProfile(
): Promise<ProgressionClientResult<{ profile: unknown }>> {
  return Promise.resolve({
    success: false,
    error: "PROFILE_ENSURE_REMOVED",
    errorMessage: "Progression profile ensure moved to server-only user settings bootstrap.",
  });
}

export async function createProgressionGoal(
  input: ProgressionGoalCreateInput,
): Promise<ProgressionClientResult<{ goal: unknown; actions: unknown[] }>> {
  return runProgressionRequest(
    fetch("/api/progression/goals", jsonRequest("POST", input)),
    (data) => data.goal !== undefined ? { goal: data.goal, actions: data.actions ?? [] } : null,
    "GOAL_CREATION_FAILED",
    "Progression goal response is invalid.",
  );
}

export async function updateProgressionGoal(
  input: ProgressionGoalUpdateInput,
): Promise<ProgressionClientResult<{ goal: unknown }>> {
  return runProgressionRequest(
    fetch("/api/progression/goals", jsonRequest("PATCH", input)),
    (data) => data.goal !== undefined ? { goal: data.goal } : null,
    "GOAL_UPDATE_FAILED",
    "Progression goal response is invalid.",
  );
}

export async function runProgressionGoalOperation(
  input: ProgressionGoalOperationInput,
): Promise<ProgressionClientResult<{ goal?: unknown; actions?: unknown[] }>> {
  return runProgressionRequest(
    fetch("/api/progression/goals", jsonRequest("PATCH", input)),
    (data) => ({ goal: data.goal, actions: data.actions }),
    "GOAL_OPERATION_FAILED",
    "Progression goal operation response is invalid.",
  );
}

export async function deleteProgressionGoal(
  id: string,
): Promise<ProgressionClientResult<{ goal: unknown }>> {
  return runProgressionRequest(
    fetch(`/api/progression/goals?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
    (data) => data.goal !== undefined ? { goal: data.goal } : null,
    "GOAL_DELETE_FAILED",
    "Progression goal delete response is invalid.",
  );
}

export async function createProgressionCheckin(
  actionId: string,
): Promise<ProgressionClientResult<{ checkin: unknown }>> {
  return runProgressionRequest(
    fetch("/api/progression/check-ins", jsonRequest("POST", { actionId })),
    (data) => data.checkin !== undefined ? { checkin: data.checkin } : null,
    "CHECKIN_CREATION_FAILED",
    "Progression check-in response is invalid.",
  );
}

export async function undoProgressionCheckin(
  checkinId: string,
): Promise<ProgressionClientResult<{ checkin: unknown }>> {
  return runProgressionRequest(
    fetch(`/api/progression/check-ins?id=${encodeURIComponent(checkinId)}`, { method: "DELETE" }),
    (data) => data.checkin !== undefined ? { checkin: data.checkin } : null,
    "CHECKIN_UNDO_FAILED",
    "Progression check-in undo response is invalid.",
  );
}

export async function resolveProgressionDeadline(
  input: ProgressionDeadlineReviewInput,
): Promise<ProgressionClientResult<{ goal: unknown }>> {
  return runProgressionRequest(
    fetch("/api/progression/deadlines", jsonRequest("PATCH", input)),
    (data) => data.goal !== undefined ? { goal: data.goal } : null,
    "DEADLINE_RESOLUTION_FAILED",
    "Progression deadline response is invalid.",
  );
}

export async function getProgressionXpHistory(
  options: { limit?: number; offset?: number } = {},
): Promise<ProgressionClientResult<{ history: unknown[]; count: number }>> {
  const params = new URLSearchParams();
  if (options.limit !== undefined) {
    params.set("limit", String(options.limit));
  }
  if (options.offset !== undefined) {
    params.set("offset", String(options.offset));
  }
  const query = params.toString();

  return runProgressionRequest(
    fetch(`/api/progression/xp-history${query ? `?${query}` : ""}`),
    (data) => ({
      history: Array.isArray(data.history) ? data.history : [],
      count: typeof data.count === "number" ? data.count : 0,
    }),
    "XP_HISTORY_LOAD_FAILED",
    "Progression XP history response is invalid.",
  );
}
