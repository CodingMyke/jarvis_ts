"use client";

import { create } from "zustand";
import type {
  ProgressionDeadlineReviewInput,
  ProgressionGoalCreateInput,
  ProgressionGoalOperationInput,
  ProgressionGoalUpdateInput,
} from "../server/progression-route.schemas";
import {
  createProgressionCheckin,
  createProgressionGoal,
  deleteProgressionGoal,
  ensureProgressionProfile,
  getProgressionOverview,
  getProgressionXpHistory,
  resolveProgressionDeadline,
  runProgressionGoalOperation,
  undoProgressionCheckin,
  updateProgressionGoal,
  type ProgressionOverviewResponse,
} from "../lib/progression-client";
import { getLevelProgress } from "../server/progression-leveling";

export type ProgressionStoreStatus = "idle" | "loading" | "ready" | "error";

interface ProgressionStoreState {
  overview: ProgressionOverviewResponse | null;
  status: ProgressionStoreStatus;
  error: string | null;
  initialized: boolean;
  history: unknown[];
  historyStatus: ProgressionStoreStatus;
  deadlineWarning: boolean;
  initialize: (overview: ProgressionOverviewResponse | null) => void;
  refresh: () => Promise<boolean>;
  ensureProfile: (timezone: string) => Promise<boolean>;
  createGoal: (input: ProgressionGoalCreateInput) => Promise<boolean>;
  updateGoal: (input: ProgressionGoalUpdateInput) => Promise<boolean>;
  runGoalOperation: (input: ProgressionGoalOperationInput) => Promise<boolean>;
  deleteGoal: (id: string) => Promise<boolean>;
  checkIn: (actionId: string) => Promise<boolean>;
  undoCheckIn: (checkinId: string) => Promise<boolean>;
  resolveDeadline: (input: ProgressionDeadlineReviewInput) => Promise<boolean>;
  loadHistory: (options?: { limit?: number; offset?: number }) => Promise<boolean>;
}

function getDeadlineWarning(overview: ProgressionOverviewResponse | null): boolean {
  return overview?.deadlineWarning === true;
}

function setOverviewState(
  overview: ProgressionOverviewResponse | null,
): Pick<ProgressionStoreState, "overview" | "status" | "error" | "initialized" | "deadlineWarning"> {
  return {
    overview,
    status: "ready",
    error: null,
    initialized: true,
    deadlineWarning: getDeadlineWarning(overview),
  };
}

function getErrorMessage(result: { errorMessage?: string; error?: string }): string {
  return result.errorMessage ?? result.error ?? "Progression operation failed.";
}

function asOverviewObject(
  overview: ProgressionOverviewResponse | null,
): Record<string, unknown> | null {
  return overview && typeof overview === "object" ? overview : null;
}

function getActionById(
  overview: ProgressionOverviewResponse | null,
  actionId: string,
): Record<string, unknown> | null {
  const overviewObject = asOverviewObject(overview);
  if (!overviewObject || !Array.isArray(overviewObject.actions)) {
    return null;
  }

  return (
    overviewObject.actions.find((action) => {
      return (
        typeof action === "object"
        && action !== null
        && "id" in action
        && (action as Record<string, unknown>).id === actionId
      );
    }) as Record<string, unknown> | undefined
  ) ?? null;
}

function getCheckinById(
  overview: ProgressionOverviewResponse | null,
  checkinId: string,
): Record<string, unknown> | null {
  const overviewObject = asOverviewObject(overview);
  if (!overviewObject || !Array.isArray(overviewObject.checkins)) {
    return null;
  }

  return (
    overviewObject.checkins.find((checkin) => {
      return (
        typeof checkin === "object"
        && checkin !== null
        && "id" in checkin
        && (checkin as Record<string, unknown>).id === checkinId
      );
    }) as Record<string, unknown> | undefined
  ) ?? null;
}

function getCheckinXp(checkin: Record<string, unknown> | null): number {
  return checkin ? Number(checkin.xp_awarded ?? 0) || 0 : 0;
}

function getProfileAndLevelProgress(
  overview: ProgressionOverviewResponse | null,
): {
  profile: Record<string, unknown>;
  levelProgress: ReturnType<typeof getLevelProgress>;
} | null {
  const overviewObject = asOverviewObject(overview);
  if (!overviewObject || typeof overviewObject.profile !== "object" || overviewObject.profile === null) {
    return null;
  }

  const profile = overviewObject.profile as Record<string, unknown>;
  const totalXp = Number(profile.total_xp ?? 0) || 0;

  return {
    profile,
    levelProgress: getLevelProgress(totalXp),
  };
}

function adjustOverviewXp(
  overview: ProgressionOverviewResponse | null,
  xpDelta: number,
): ProgressionOverviewResponse | null {
  if (!overview || xpDelta === 0) {
    return overview;
  }

  const current = getProfileAndLevelProgress(overview);
  if (!current) {
    return overview;
  }

  const totalXp = Math.max(current.levelProgress.totalXp + xpDelta, 0);
  const levelProgress = getLevelProgress(totalXp);

  return {
    ...overview,
    profile: {
      ...current.profile,
      total_xp: totalXp,
      level: levelProgress.level,
    },
    levelProgress,
  };
}

function withOptimisticCheckin(
  overview: ProgressionOverviewResponse | null,
  checkin: Record<string, unknown>,
): ProgressionOverviewResponse | null {
  if (!overview) {
    return overview;
  }

  const checkinXp = getCheckinXp(checkin);

  return adjustOverviewXp(
    {
      ...overview,
      checkins: [...(overview.checkins ?? []), checkin],
    },
    checkinXp,
  );
}

function withoutCheckin(
  overview: ProgressionOverviewResponse | null,
  checkinId: string,
): ProgressionOverviewResponse | null {
  if (!overview) {
    return overview;
  }

  return {
    ...overview,
    checkins: (overview.checkins ?? []).filter((checkin) => {
      return !(typeof checkin === "object" && checkin !== null && "id" in checkin
        && checkin.id === checkinId);
    }),
  };
}

function withConfirmedCheckin(
  overview: ProgressionOverviewResponse | null,
  optimisticCheckinId: string,
  checkin: Record<string, unknown>,
): ProgressionOverviewResponse | null {
  if (!overview) {
    return overview;
  }

  const currentCheckins = Array.isArray(overview.checkins) ? overview.checkins : [];
  const optimisticCheckin = getCheckinById(overview, optimisticCheckinId);
  const optimisticXp = getCheckinXp(optimisticCheckin);
  const confirmedXp = getCheckinXp(checkin);
  const checkins = currentCheckins.some((value) => {
    return (
      typeof value === "object"
      && value !== null
      && "id" in value
      && (value as Record<string, unknown>).id === optimisticCheckinId
    );
  })
    ? currentCheckins.map((value) => {
        if (
          typeof value === "object"
          && value !== null
          && "id" in value
          && (value as Record<string, unknown>).id === optimisticCheckinId
        ) {
          return checkin;
        }

        return value;
      })
    : [...currentCheckins, checkin];

  return adjustOverviewXp(
    {
      ...overview,
      checkins,
    },
    confirmedXp - optimisticXp,
  );
}

function withRemovedCheckin(
  overview: ProgressionOverviewResponse | null,
  checkinId: string,
): ProgressionOverviewResponse | null {
  if (!overview) {
    return overview;
  }

  const checkin = getCheckinById(overview, checkinId);
  const checkinXp = getCheckinXp(checkin);

  return adjustOverviewXp(withoutCheckin(overview, checkinId), -checkinXp);
}

function buildOptimisticCheckin(
  overview: ProgressionOverviewResponse | null,
  actionId: string,
): Record<string, unknown> | null {
  const overviewObject = asOverviewObject(overview);
  const action = getActionById(overview, actionId);
  const profile = overviewObject && typeof overviewObject.profile === "object"
    && overviewObject.profile !== null
    ? overviewObject.profile as Record<string, unknown>
    : null;

  if (!overviewObject || !action || !profile) {
    return null;
  }

  return {
    id: `optimistic-${actionId}`,
    action_id: actionId,
    goal_id: typeof action.goal_id === "string" ? action.goal_id : "",
    local_date: typeof overviewObject.todayLocalDate === "string" ? overviewObject.todayLocalDate : "",
    timezone: typeof profile.timezone === "string" ? profile.timezone : "UTC",
    user_id: typeof profile.user_id === "string" ? profile.user_id : "",
    xp_awarded: Number(action.xp_per_checkin ?? 0) || 0,
    created_at: new Date().toISOString(),
  };
}

export const useProgressionStore = create<ProgressionStoreState>((set, get) => ({
  overview: null,
  status: "idle",
  error: null,
  initialized: false,
  history: [],
  historyStatus: "idle",
  deadlineWarning: false,
  initialize: (overview) => {
    set(setOverviewState(overview));
  },
  refresh: async () => {
    set((state) => ({ ...state, status: "loading", error: null }));
    const result = await getProgressionOverview();

    if (!result.success) {
      set((state) => ({
        ...state,
        status: "error",
        error: getErrorMessage(result),
        initialized: true,
      }));
      return false;
    }

    set(setOverviewState(result.overview));
    return true;
  },
  ensureProfile: async (timezone) => {
    const result = await ensureProgressionProfile(timezone);
    if (!result.success) {
      set((state) => ({ ...state, status: "error", error: getErrorMessage(result) }));
      return false;
    }

    return get().refresh();
  },
  createGoal: async (input) => {
    const result = await createProgressionGoal(input);
    if (!result.success) {
      set((state) => ({ ...state, status: "error", error: getErrorMessage(result) }));
      return false;
    }

    return get().refresh();
  },
  updateGoal: async (input) => {
    const result = await updateProgressionGoal(input);
    if (!result.success) {
      set((state) => ({ ...state, status: "error", error: getErrorMessage(result) }));
      return false;
    }

    return get().refresh();
  },
  runGoalOperation: async (input) => {
    const result = await runProgressionGoalOperation(input);
    if (!result.success) {
      set((state) => ({ ...state, status: "error", error: getErrorMessage(result) }));
      return false;
    }

    return get().refresh();
  },
  deleteGoal: async (id) => {
    const result = await deleteProgressionGoal(id);
    if (!result.success) {
      set((state) => ({ ...state, status: "error", error: getErrorMessage(result) }));
      return false;
    }

    return get().refresh();
  },
  checkIn: async (actionId) => {
    const previousOverview = get().overview;
    const optimisticCheckin = buildOptimisticCheckin(previousOverview, actionId);

    if (optimisticCheckin) {
      set((state) => ({
        ...state,
        overview: withOptimisticCheckin(state.overview, optimisticCheckin),
        status: "ready",
        error: null,
      }));
    } else {
      set((state) => ({ ...state, status: "ready", error: null }));
    }

    const result = await createProgressionCheckin(actionId);
    if (!result.success) {
      set((state) => ({
        ...state,
        overview: previousOverview,
        status: "error",
        error: getErrorMessage(result),
      }));
      return false;
    }

    if (optimisticCheckin) {
      set((state) => ({
        ...state,
        overview: withConfirmedCheckin(
          state.overview,
          String(optimisticCheckin.id),
          result.checkin as Record<string, unknown>,
        ),
        status: "ready",
        error: null,
      }));
    } else {
      set((state) => ({ ...state, status: "ready", error: null }));
    }

    return true;
  },
  undoCheckIn: async (checkinId) => {
    const previousOverview = get().overview;
    const optimisticCheckin = getCheckinById(previousOverview, checkinId);

    if (optimisticCheckin) {
      set((state) => ({
        ...state,
        overview: withRemovedCheckin(state.overview, checkinId),
        status: "ready",
        error: null,
      }));
    } else {
      set((state) => ({ ...state, status: "ready", error: null }));
    }

    const result = await undoProgressionCheckin(checkinId);
    if (!result.success) {
      set((state) => ({
        ...state,
        overview: previousOverview,
        status: "error",
        error: getErrorMessage(result),
      }));
      return false;
    }

    set((state) => ({ ...state, status: "ready", error: null }));
    return true;
  },
  resolveDeadline: async (input) => {
    const result = await resolveProgressionDeadline(input);
    if (!result.success) {
      set((state) => ({ ...state, status: "error", error: getErrorMessage(result) }));
      return false;
    }

    return get().refresh();
  },
  loadHistory: async (options) => {
    set((state) => ({ ...state, historyStatus: "loading" }));
    const result = await getProgressionXpHistory(options);

    if (!result.success) {
      set((state) => ({
        ...state,
        historyStatus: "error",
        error: getErrorMessage(result),
      }));
      return false;
    }

    set((state) => ({
      ...state,
      history: result.history,
      historyStatus: "ready",
      error: null,
    }));
    return true;
  },
}));
