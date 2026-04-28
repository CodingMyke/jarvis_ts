// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProgressionGoalDetails } from "@/app/_features/progression/lib/progression-client";
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
      todayItems: [],
      weeklyItems: [],
      expiredGoals: [],
      xpHistory: [],
      todayLocalDate: "2026-04-29",
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

vi.mock("@/app/_features/progression/lib/progression-client", () => ({
  getProgressionGoalDetails: vi.fn(),
}));

vi.mock("@/app/_features/progression/state/progression.store", () => ({
  useProgressionStore: (
    selector: (state: typeof progressionWorkspaceMocks.storeState) => unknown,
  ) => selector(progressionWorkspaceMocks.storeState),
}));

describe("useProgressionWorkspace", () => {
  beforeEach(() => {
    progressionWorkspaceMocks.storeState.loadHistory.mockReset();
    vi.mocked(getProgressionGoalDetails).mockReset();
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

  it("loads goal details on demand and preserves recurring action ids when submitting an edited goal", async () => {
    vi.mocked(getProgressionGoalDetails).mockResolvedValue({
      success: true,
      goal: {
        id: "goal-1",
        title: "Ship progression UI",
        description: "",
        status: "in_progress",
        deadline: null,
        completion_xp: 25,
        deadline_change_count: 0,
      },
      actions: [
        {
          id: "action-1",
          title: "Daily polish",
          description: null,
          frequency_type: "daily",
          frequency_config: {},
          xp_per_checkin: 5,
          active: true,
        },
      ],
    });

    const overview = progressionWorkspaceMocks.storeState.overview as {
      goals: Array<Record<string, unknown>>;
    };
    overview.goals = [
      {
        id: "goal-1",
        title: "Ship progression UI",
        description: "",
        status: "in_progress",
        deadline: null,
        completion_xp: 25,
        deadline_change_count: 0,
      },
    ];

    const { result } = renderHook(() => useProgressionWorkspace());

    act(() => {
      result.current.openEditGoal("goal-1");
    });

    await waitFor(() => {
      expect(getProgressionGoalDetails).toHaveBeenCalledWith("goal-1");
      expect(result.current.formStatus).toBe("ready");
      expect(result.current.formInitialValue).not.toBeNull();
    });

    act(() => {
      result.current.submitGoalForm({
        id: "goal-1",
        title: "Ship progression UI",
        description: "",
        deadline: "",
        completionXp: 25,
        startNow: true,
        status: "in_progress",
        actions: [
          {
            id: "action-1",
            title: "Daily polish updated",
            description: "",
            frequencyType: "daily",
            weekdays: [1, 3, 5],
            targetCount: 3,
            xpPerCheckin: 5,
            active: true,
          },
        ],
      });
    });

    expect(progressionWorkspaceMocks.storeState.updateGoal).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "goal-1",
        actions: [
          expect.objectContaining({
            id: "action-1",
            title: "Daily polish updated",
          }),
        ],
      }),
    );
  });
});
