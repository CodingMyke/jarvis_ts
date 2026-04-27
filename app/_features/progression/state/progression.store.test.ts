import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProgressionCheckin,
  createProgressionGoal,
  getProgressionOverview,
  getProgressionXpHistory,
  resolveProgressionDeadline,
  undoProgressionCheckin,
} from "@/app/_features/progression/lib/progression-client";
import { useProgressionStore } from "./progression.store";

function createCheckin() {
  return {
    id: "checkin-1",
    action_id: "action-1",
    goal_id: "goal-1",
    local_date: "2026-04-29",
    timezone: "Europe/Rome",
    user_id: "user-1",
    xp_awarded: 5,
    created_at: "2026-04-29T09:00:00.000Z",
  };
}

vi.mock("@/app/_features/progression/lib/progression-client", () => ({
  createProgressionCheckin: vi.fn(),
  createProgressionGoal: vi.fn(),
  deleteProgressionGoal: vi.fn(),
  ensureProgressionProfile: vi.fn(),
  getProgressionOverview: vi.fn(),
  getProgressionXpHistory: vi.fn(),
  resolveProgressionDeadline: vi.fn(),
  runProgressionGoalOperation: vi.fn(),
  undoProgressionCheckin: vi.fn(),
  updateProgressionGoal: vi.fn(),
}));

function createOverview() {
  return {
    profile: { user_id: "user-1", total_xp: 10, level: 2, timezone: "Europe/Rome" },
    goals: [{ id: "goal-1", title: "Learn piano" }],
    actions: [{ id: "action-1", goal_id: "goal-1", title: "Practice", xp_per_checkin: 5 }],
    checkins: [],
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
  };
}

describe("progression store", () => {
  beforeEach(() => {
    useProgressionStore.setState({
      overview: null,
      status: "idle",
      error: null,
      initialized: false,
      history: [],
      historyStatus: "idle",
      deadlineWarning: false,
    });
    vi.clearAllMocks();
  });

  it("refreshes overview and stores deadline warning", async () => {
    vi.mocked(getProgressionOverview).mockResolvedValue({
      success: true,
      overview: { ...createOverview(), deadlineWarning: true },
    });

    await expect(useProgressionStore.getState().refresh()).resolves.toBe(true);

    expect(useProgressionStore.getState()).toMatchObject({
      status: "ready",
      initialized: true,
      deadlineWarning: true,
    });
  });

  it("stores refresh errors", async () => {
    vi.mocked(getProgressionOverview).mockResolvedValue({
      success: false,
      error: "EXECUTION_ERROR",
      errorMessage: "Boom",
      status: 500,
    });

    await expect(useProgressionStore.getState().refresh()).resolves.toBe(false);

    expect(useProgressionStore.getState()).toMatchObject({
      status: "error",
      error: "Boom",
      initialized: true,
    });
  });

  it("refreshes after goal creation and deadline resolution", async () => {
    vi.mocked(createProgressionGoal).mockResolvedValue({
      success: true,
      goal: { id: "goal-1" },
      actions: [],
    });
    vi.mocked(resolveProgressionDeadline).mockResolvedValue({
      success: true,
      goal: { id: "goal-1" },
    });
    vi.mocked(getProgressionOverview).mockResolvedValue({
      success: true,
      overview: createOverview(),
    });

    await expect(
      useProgressionStore.getState().createGoal({ title: "Learn piano" }),
    ).resolves.toBe(true);
    await expect(
      useProgressionStore.getState().resolveDeadline({ goalId: "goal-1", action: "complete" }),
    ).resolves.toBe(true);

    expect(getProgressionOverview).toHaveBeenCalledTimes(2);
  });

  it("optimistically adds check-ins and rolls back on failure", async () => {
    useProgressionStore.setState({
      overview: createOverview(),
      status: "ready",
      initialized: true,
      deadlineWarning: false,
    });
    vi.mocked(createProgressionCheckin).mockResolvedValue({
      success: false,
      error: "CREATION_FAILED",
      errorMessage: "Nope",
      status: 500,
    });

    await expect(useProgressionStore.getState().checkIn("action-1")).resolves.toBe(false);

    expect(useProgressionStore.getState()).toMatchObject({
      status: "error",
      error: "Nope",
      overview: { checkins: [] },
    });
  });

  it("optimistically adds check-ins and updates XP without refreshing", async () => {
    useProgressionStore.setState({
      overview: createOverview(),
      status: "ready",
      initialized: true,
      deadlineWarning: false,
    });
    let resolveCheckin:
      | ((value: { success: true; checkin: ReturnType<typeof createCheckin> }) => void)
      | undefined;
    vi.mocked(createProgressionCheckin).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCheckin = resolve;
        }),
    );

    const promise = useProgressionStore.getState().checkIn("action-1");

    expect(useProgressionStore.getState().overview).toMatchObject({
      checkins: [expect.objectContaining({ id: "optimistic-action-1", xp_awarded: 5 })],
      profile: { total_xp: 15 },
      levelProgress: { totalXp: 15 },
    });
    expect(getProgressionOverview).not.toHaveBeenCalled();

    resolveCheckin?.({ success: true, checkin: createCheckin() });

    await expect(promise).resolves.toBe(true);

    expect(useProgressionStore.getState().overview).toMatchObject({
      checkins: [expect.objectContaining({ id: "checkin-1" })],
      profile: { total_xp: 15 },
      levelProgress: { totalXp: 15 },
    });
    expect(getProgressionOverview).not.toHaveBeenCalled();
  });

  it("optimistically removes check-ins and updates XP without refreshing", async () => {
    useProgressionStore.setState({
      overview: {
        ...createOverview(),
        profile: { user_id: "user-1", total_xp: 15, level: 2, timezone: "Europe/Rome" },
        levelProgress: {
          level: 2,
          totalXp: 15,
          xpInCurrentLevel: 5,
          xpRequiredForNextLevel: 28,
          xpRemainingForNextLevel: 23,
        },
        checkins: [createCheckin()],
      },
      status: "ready",
      initialized: true,
      deadlineWarning: false,
    });
    let resolveUndo:
      | ((value: { success: true; checkin: ReturnType<typeof createCheckin> }) => void)
      | undefined;
    vi.mocked(undoProgressionCheckin).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUndo = resolve;
        }),
    );

    const promise = useProgressionStore.getState().undoCheckIn("checkin-1");

    expect(useProgressionStore.getState().overview).toMatchObject({
      checkins: [],
      profile: { total_xp: 10 },
      levelProgress: { totalXp: 10 },
    });
    expect(getProgressionOverview).not.toHaveBeenCalled();

    resolveUndo?.({ success: true, checkin: createCheckin() });

    await expect(promise).resolves.toBe(true);

    expect(useProgressionStore.getState().overview).toMatchObject({
      checkins: [],
      profile: { total_xp: 10 },
      levelProgress: { totalXp: 10 },
    });
    expect(getProgressionOverview).not.toHaveBeenCalled();
  });

  it("loads XP history on demand", async () => {
    vi.mocked(getProgressionXpHistory).mockResolvedValue({
      success: true,
      history: [{ id: "xp-1", xp_amount: 5 }],
      count: 1,
    });

    await expect(useProgressionStore.getState().loadHistory()).resolves.toBe(true);

    expect(useProgressionStore.getState()).toMatchObject({
      historyStatus: "ready",
      history: [{ id: "xp-1" }],
    });
  });
});
