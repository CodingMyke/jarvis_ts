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
    const result = await createProgressionCheckin(actionId);
    if (!result.success) {
      set((state) => ({
        ...state,
        status: "error",
        error: getErrorMessage(result),
      }));
      return false;
    }

    return get().refresh();
  },
  undoCheckIn: async (checkinId) => {
    const result = await undoProgressionCheckin(checkinId);
    if (!result.success) {
      set((state) => ({
        ...state,
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
