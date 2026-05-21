// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteProgressionGoal,
  getProgressionGoalDetails,
  runProgressionGoalOperation,
  updateProgressionGoal,
} from "@/app/_features/progression/lib/progression-client";
import { useProgressionWorkspace } from "./useProgressionWorkspace";

const navigationMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
}));

vi.mock("@/app/_features/progression/lib/progression-client", () => ({
  createProgressionGoal: vi.fn(),
  deleteProgressionGoal: vi.fn(),
  getProgressionGoalDetails: vi.fn(),
  runProgressionGoalOperation: vi.fn(),
  updateProgressionGoal: vi.fn(),
}));

const initialGoals = [
  {
    id: "goal-1",
    title: "Ship progression UI",
    description: "",
    status: "in_progress",
    deadline: null,
    completion_xp: 25,
  },
  {
    id: "goal-2",
    title: "Review the weekly plan",
    description: "",
    status: "to_start",
    deadline: null,
    completion_xp: 15,
  },
];

describe("useProgressionWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults to in-progress goals and routes lifecycle actions through the split APIs", async () => {
    vi.mocked(runProgressionGoalOperation).mockResolvedValue({ success: true });
    vi.mocked(deleteProgressionGoal).mockResolvedValue({ success: true, goal: { id: "goal-2" } });

    const { result } = renderHook(() => useProgressionWorkspace(initialGoals));

    expect(result.current.selectedFilter).toBe("in_progress");
    expect(result.current.filteredGoals).toHaveLength(1);
    expect(result.current.filteredGoals[0]?.id).toBe("goal-1");

    act(() => {
      result.current.startGoal("goal-2");
      result.current.deleteGoal("goal-2");
    });

    await waitFor(() => {
      expect(runProgressionGoalOperation).toHaveBeenCalledWith({
        goalId: "goal-2",
        operation: "start",
      });
      expect(deleteProgressionGoal).toHaveBeenCalledWith("goal-2");
      expect(navigationMocks.refresh).toHaveBeenCalledTimes(2);
    });
  });

  it("loads goal details on demand and preserves recurring action ids when submitting an edited goal", async () => {
    vi.mocked(getProgressionGoalDetails).mockResolvedValue({
      success: true,
      goal: { id: "goal-1" },
      actions: [
        {
          id: "action-1",
          title: "Daily polish",
          description: null,
          frequency_type: "daily",
          frequency_config: {},
          xp_per_checkin: 5,
          active: true,
          has_history: true,
        },
      ],
    });
    vi.mocked(updateProgressionGoal).mockResolvedValue({
      success: true,
      goal: { id: "goal-1" },
    });

    const { result } = renderHook(() => useProgressionWorkspace(initialGoals));

    act(() => {
      result.current.openEditGoal("goal-1");
    });

    await waitFor(() => {
      expect(getProgressionGoalDetails).toHaveBeenCalledWith("goal-1");
      expect(result.current.formStatus).toBe("ready");
      expect(result.current.formInitialValue).not.toBeNull();
      expect(result.current.formInitialValue?.actions[0]?.hasHistory).toBe(true);
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
            hasHistory: true,
          },
        ],
      });
    });

    await waitFor(() => {
      expect(updateProgressionGoal).toHaveBeenCalledWith(
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
      expect(navigationMocks.refresh).toHaveBeenCalled();
    });
  });
});
