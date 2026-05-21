"use client";

import { create } from "zustand";
import { getLevelProgress } from "../server/progression-leveling";
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
  getProgressionOverview,
  getProgressionXpHistory,
  resolveProgressionDeadline,
  runProgressionGoalOperation,
  undoProgressionCheckin,
  updateProgressionGoal,
  type ProgressionOverviewResponse,
} from "../lib/progression-client";

export type ProgressionStoreStatus = "idle" | "loading" | "ready" | "error";

interface ProgressionVisibleItemRecord {
  id?: unknown;
  xpValue?: unknown;
  checkinId?: unknown;
  pending?: unknown;
  [key: string]: unknown;
}

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

function asVisibleItems(value: unknown): ProgressionVisibleItemRecord[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is ProgressionVisibleItemRecord => typeof entry === "object" && entry !== null,
      )
    : [];
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function applyOverviewXpDelta(
  overview: ProgressionOverviewResponse,
  delta: number,
): ProgressionOverviewResponse {
  const profile = typeof overview.profile === "object" && overview.profile !== null
    ? overview.profile as Record<string, unknown>
    : {};
  const totalXp = Math.max(0, asNumber(profile.total_xp) + delta);

  return {
    ...overview,
    profile: {
      ...profile,
      total_xp: totalXp,
    },
    levelProgress: getLevelProgress(totalXp),
  };
}

function replaceVisibleItems(
  overview: ProgressionOverviewResponse,
  key: "todayItems" | "weeklyItems",
  predicate: (item: ProgressionVisibleItemRecord) => boolean,
  mapItem: (item: ProgressionVisibleItemRecord) => ProgressionVisibleItemRecord,
): ProgressionOverviewResponse | null {
  const items = asVisibleItems(overview[key]);
  const index = items.findIndex(predicate);

  if (index < 0) {
    return null;
  }

  const nextItems = [...items];
  const currentItem = nextItems[index];
  nextItems[index] = mapItem(currentItem);

  return {
    ...overview,
    [key]: nextItems,
  };
}

function applyOptimisticCheckIn(
  overview: ProgressionOverviewResponse | null,
  actionId: string,
): ProgressionOverviewResponse | null {
  if (!overview) {
    return null;
  }

  const collections: Array<"todayItems" | "weeklyItems"> = ["todayItems", "weeklyItems"];

  for (const key of collections) {
    const nextOverview = replaceVisibleItems(
      overview,
      key,
      (item) => item.id === actionId && asString(item.checkinId) === null,
      (item) => ({
        ...item,
        checkinId: `optimistic:${actionId}`,
        pending: true,
      }),
    );

    if (nextOverview) {
      const items = asVisibleItems(overview[key]);
      const currentItem = items.find((item) => item.id === actionId);
      return applyOverviewXpDelta(nextOverview, asNumber(currentItem?.xpValue));
    }
  }

  return null;
}

function applyOptimisticUndo(
  overview: ProgressionOverviewResponse | null,
  checkinId: string,
): ProgressionOverviewResponse | null {
  if (!overview) {
    return null;
  }

  const collections: Array<"todayItems" | "weeklyItems"> = ["todayItems", "weeklyItems"];

  for (const key of collections) {
    const items = asVisibleItems(overview[key]);
    const currentItem = items.find((item) => item.checkinId === checkinId);

    if (!currentItem) {
      continue;
    }

    const nextOverview = replaceVisibleItems(
      overview,
      key,
      (item) => item.checkinId === checkinId,
      (item) => ({
        ...item,
        checkinId: null,
        pending: true,
      }),
    );

    if (nextOverview) {
      return applyOverviewXpDelta(nextOverview, -asNumber(currentItem.xpValue));
    }
  }

  return null;
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
  ensureProfile: async () => {
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
    const optimisticOverview = applyOptimisticCheckIn(previousOverview, actionId);

    if (optimisticOverview) {
      set((state) => ({
        ...state,
        overview: optimisticOverview,
        status: "ready",
        error: null,
      }));
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

    return get().refresh();
  },
  undoCheckIn: async (checkinId) => {
    const previousOverview = get().overview;
    const optimisticOverview = applyOptimisticUndo(previousOverview, checkinId);

    if (optimisticOverview) {
      set((state) => ({
        ...state,
        overview: optimisticOverview,
        status: "ready",
        error: null,
      }));
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

    return get().refresh();
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
