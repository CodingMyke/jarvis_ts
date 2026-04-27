import type {
  ProgressionDeadlineReviewInput,
  ProgressionGoalCreateInput,
  ProgressionGoalOperationInput,
  ProgressionGoalUpdateInput,
} from "../server/progression-route.schemas";

export interface ProgressionOperationError {
  success: false;
  error: string;
  errorMessage: string;
  status?: number;
}

export interface ProgressionOverviewResponse {
  profile?: unknown;
  goals?: unknown[];
  actions?: unknown[];
  checkins?: unknown[];
  expiredGoals?: unknown[];
  xpHistory?: unknown[];
  todayLocalDate?: string;
  deadlineWarning?: boolean;
  [key: string]: unknown;
}

export type ProgressionClientResult<T extends object> =
  | ({ success: true } & T)
  | ProgressionOperationError;

interface ProgressionApiResponse {
  success?: boolean;
  overview?: ProgressionOverviewResponse;
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

export async function ensureProgressionProfile(
  timezone: string,
): Promise<ProgressionClientResult<{ profile: unknown }>> {
  return runProgressionRequest(
    fetch("/api/progression/profile", jsonRequest("POST", { timezone })),
    (data) => data.profile !== undefined ? { profile: data.profile } : null,
    "PROFILE_ENSURE_FAILED",
    "Progression profile response is invalid.",
  );
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
