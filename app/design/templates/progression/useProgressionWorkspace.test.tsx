// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProgressionWorkspace } from "./useProgressionWorkspace";

const progressionWorkspaceMocks = vi.hoisted(() => ({
  storeState: {
    overview: {
      profile: {
        user_id: "user-1",
        total_xp: 10,
        level: 2,
        timezone: "Europe/Rome",
      },
      goals: [],
      actions: [],
      checkins: [],
      expiredGoals: [],
      xpHistory: [],
      todayLocalDate: "2026-04-29",
      isoWeekday: 3,
      weekStart: "2026-04-27",
      weekEnd: "2026-05-03",
      deadlineWarning: false,
      levelProgress: {
        level: 2,
        totalXp: 10,
        xpInCurrentLevel: 0,
        xpRequiredForNextLevel: 28,
        xpRemainingForNextLevel: 28,
      },
    },
    status: "ready" as const,
    error: null as string | null,
    initialized: true,
    history: [],
    historyStatus: "idle" as const,
    deadlineWarning: false,
    refresh: vi.fn(),
    ensureProfile: vi.fn(),
    createGoal: vi.fn(),
    updateGoal: vi.fn(),
    runGoalOperation: vi.fn(),
    deleteGoal: vi.fn(),
    checkIn: vi.fn(),
    undoCheckIn: vi.fn(),
    resolveDeadline: vi.fn(),
    loadHistory: vi.fn(),
  },
}));

vi.mock("@/app/_features/progression/state/progression.store", () => ({
  useProgressionStore: (
    selector: (state: typeof progressionWorkspaceMocks.storeState) => unknown,
  ) => selector(progressionWorkspaceMocks.storeState),
}));

describe("useProgressionWorkspace", () => {
  beforeEach(() => {
    progressionWorkspaceMocks.storeState.loadHistory.mockReset();
  });

  it("loads only the latest 50 XP history records when opening history", () => {
    const { result } = renderHook(() => useProgressionWorkspace());

    act(() => {
      result.current.openHistory();
    });

    expect(progressionWorkspaceMocks.storeState.loadHistory).toHaveBeenCalledWith({
      limit: 50,
      offset: 0,
    });
  });
});
