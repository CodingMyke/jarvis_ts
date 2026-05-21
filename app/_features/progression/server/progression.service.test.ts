import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProgressionActionRow, ProgressionGoalRow } from "./progression.types";

const userId = "123e4567-e89b-42d3-a456-426614174010";
const goalId = "123e4567-e89b-42d3-a456-426614174000";
const actionId = "123e4567-e89b-42d3-a456-426614174001";
const checkinId = "123e4567-e89b-42d3-a456-426614174002";

const openGoal: ProgressionGoalRow = {
  id: goalId,
  user_id: userId,
  title: "Learn piano",
  description: null,
  status: "in_progress",
  deadline: "2026-05-01",
  completion_xp: 30,
  started_at: "2026-04-27T10:00:00.000Z",
  completed_at: null,
  failed_at: null,
  deadline_change_count: 0,
  deleted_at: null,
  created_at: "2026-04-27T10:00:00.000Z",
  updated_at: "2026-04-27T10:00:00.000Z",
};

const actionRow: ProgressionActionRow = {
  id: actionId,
  goal_id: goalId,
  user_id: userId,
  title: "Practice scales",
  description: null,
  frequency_type: "daily",
  frequency_config: {},
  xp_per_checkin: 5,
  active: true,
  deactivated_at: null,
  created_at: "2026-04-27T10:00:00.000Z",
  updated_at: "2026-04-27T10:00:00.000Z",
};

function createQuery(result: unknown) {
  const builder = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    in: vi.fn(),
    is: vi.fn(),
    lt: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    then: vi.fn((resolve, reject) => Promise.resolve(result).then(resolve, reject)),
  };

  for (const key of [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "neq",
    "in",
    "is",
    "lt",
    "gte",
    "lte",
    "order",
    "range",
  ] as const) {
    builder[key].mockReturnValue(builder);
  }

  return builder;
}

function createSupabase(queries: unknown[], rpcResult?: unknown) {
  const builders = queries.map(createQuery);
  return {
    from: vi.fn(() => {
      const builder = builders.shift();
      if (!builder) {
        throw new Error("Unexpected query");
      }
      return builder;
    }),
    rpc: vi.fn().mockResolvedValue(rpcResult ?? { data: null, error: null }),
  };
}

describe("progression.service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-29T10:00:00.000Z"));
  });

  it("ensures the profile through the Supabase RPC", async () => {
    const { ensureProgressionProfile } = await import("./progression.service");
    const supabase = createSupabase([], {
      data: { user_id: userId, total_xp: 0, level: 1 },
      error: null,
    });

    await expect(ensureProgressionProfile(supabase as never)).resolves.toMatchObject({
      success: true,
      profile: { total_xp: 0 },
    });
    expect(supabase.rpc).toHaveBeenCalledWith("progression_ensure_profile");

    supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: "rpc failed" } });
    await expect(ensureProgressionProfile(supabase as never)).resolves.toEqual({
      success: false,
      error: "rpc failed",
    });
  });

  it("loads overview data with profile, goals, actions, check-ins, deadlines and history", async () => {
    const { getProgressionOverview } = await import("./progression.service");
    const supabase = createSupabase([
      { data: { user_id: userId, total_xp: 10, level: 2 }, error: null },
      { data: { timezone: "Europe/Rome" }, error: null },
      { data: [openGoal], error: null },
      { data: [actionRow], error: null },
      {
        data: [
          {
            id: checkinId,
            action_id: actionId,
            goal_id: goalId,
            user_id: userId,
            local_date: "2026-04-29",
            timezone: "Europe/Rome",
            xp_awarded: 5,
            created_at: "2026-04-29T10:00:00.000Z",
          },
        ],
        error: null,
      },
      { data: [openGoal], error: null },
      { data: [{ id: "xp-1", xp_amount: 5 }], error: null },
    ]);

    await expect(
      getProgressionOverview(supabase as never, userId, {
        status: "in_progress",
        today: "2026-04-29",
      }),
    ).resolves.toMatchObject({
      success: true,
      overview: {
        todayLocalDate: "2026-04-29",
        goals: [{ id: goalId }],
        todayItems: [
          {
            id: actionId,
            goalTitle: "Learn piano",
            xpValue: 5,
            checkinId,
          },
        ],
        weeklyItems: [],
        deadlineWarning: true,
      },
    });

    expect(supabase.from).toHaveBeenNthCalledWith(1, "progression_profiles");
    expect(supabase.from).toHaveBeenNthCalledWith(2, "user_settings");
  });

  it("treats legacy actions without a stored frequency type as daily", async () => {
    const { getProgressionToday } = await import("./progression.service");
    const legacyAction = {
      ...actionRow,
      frequency_type: undefined,
    } as unknown as ProgressionActionRow;

    const supabase = createSupabase([
      { data: { user_id: userId, total_xp: 10, level: 2 }, error: null },
      { data: { timezone: "Europe/Rome" }, error: null },
      { data: [openGoal], error: null },
      { data: [legacyAction], error: null },
      { data: [], error: null },
    ]);

    await expect(
      getProgressionToday(supabase as never, userId, {
        today: "2026-04-29",
      }),
    ).resolves.toMatchObject({
      success: true,
      today: {
        timezone: "Europe/Rome",
        todayItems: [
          {
            id: actionId,
            goalTitle: "Learn piano",
          },
        ],
      },
    });

    expect(supabase.from).toHaveBeenNthCalledWith(2, "user_settings");
  });

  it("loads goal details with action history metadata", async () => {
    const { getProgressionGoalDetails } = await import("./progression.service");
    const supabase = createSupabase([
      { data: openGoal, error: null },
      { data: [actionRow], error: null },
      { data: [{ action_id: actionId }], error: null },
    ]);

    await expect(
      getProgressionGoalDetails(supabase as never, userId, goalId),
    ).resolves.toMatchObject({
      success: true,
      details: {
        goal: { id: goalId },
        actions: [{ id: actionId, has_history: true }],
      },
    });
  });

  it("creates started goals with recurring actions", async () => {
    const { createProgressionGoal } = await import("./progression.service");
    const supabase = createSupabase([
      { data: openGoal, error: null },
      { data: [actionRow], error: null },
    ]);

    await expect(
      createProgressionGoal(supabase as never, userId, {
        title: "Learn piano",
        completionXp: 30,
        startNow: true,
        actions: [
          {
            title: "Practice scales",
            frequencyType: "daily",
            frequencyConfig: {},
            xpPerCheckin: 5,
          },
        ],
      }),
    ).resolves.toMatchObject({
      success: true,
      goal: { status: "in_progress" },
      actions: [{ id: actionId }],
    });
  });

  it("blocks economic edits on closed goals and tracks deadline changes", async () => {
    const { updateProgressionGoal } = await import("./progression.service");
    const completedGoal = { ...openGoal, status: "completed", completed_at: "now" };
    const closedSupabase = createSupabase([{ data: completedGoal, error: null }]);

    await expect(
      updateProgressionGoal(closedSupabase as never, userId, {
        id: goalId,
        completionXp: 50,
      }),
    ).resolves.toEqual({
      success: false,
      error: "Closed goals only support title and description edits.",
    });

    const deadlineSupabase = createSupabase([
      { data: { ...openGoal, deadline_change_count: 1 }, error: null },
    ]);
    await expect(
      updateProgressionGoal(deadlineSupabase as never, userId, {
        id: goalId,
        deadline: "2026-05-10",
      }),
    ).resolves.toEqual({
      success: false,
      error: "Goal deadline can only be changed once.",
    });
  });

  it("synchronizes recurring actions when a goal is updated", async () => {
    const { updateProgressionGoal } = await import("./progression.service");
    const keptActionId = actionId;
    const removedActionId = "123e4567-e89b-42d3-a456-426614174099";
    const newActionId = "123e4567-e89b-42d3-a456-426614174098";
    const updatedGoal = { ...openGoal, title: "Learn piano faster" };
    const keptAction = {
      ...actionRow,
      id: keptActionId,
      title: "Practice arpeggios",
      frequency_type: "weekly_count" as const,
      frequency_config: { targetCount: 4 },
      xp_per_checkin: 7,
    };
    const removedAction = {
      ...actionRow,
      id: removedActionId,
      title: "Old habit",
    };

    const supabase = createSupabase([
      { data: openGoal, error: null },
      { data: updatedGoal, error: null },
      { data: [keptAction, removedAction], error: null },
      { data: [], error: null },
      { data: [keptAction], error: null },
      {
        data: {
          ...actionRow,
          id: newActionId,
          goal_id: goalId,
          title: "Theory review",
          frequency_type: "daily",
          frequency_config: {},
          xp_per_checkin: 2,
        },
        error: null,
      },
      {
        data: {
          ...removedAction,
          deleted_at: "2026-04-29T10:00:00.000Z",
        },
        error: null,
      },
    ]);

    await expect(
      updateProgressionGoal(supabase as never, userId, {
        id: goalId,
        title: "Learn piano faster",
        actions: [
          {
            id: keptActionId,
            title: "Practice arpeggios",
            description: "",
            frequencyType: "weekly_count",
            frequencyConfig: { targetCount: 4 },
            xpPerCheckin: 7,
            active: true,
          },
          {
            title: "Theory review",
            description: "",
            frequencyType: "daily",
            frequencyConfig: {},
            xpPerCheckin: 2,
            active: true,
          },
        ],
      }),
    ).resolves.toMatchObject({
      success: true,
      goal: { title: "Learn piano faster" },
    });

    expect(supabase.from).toHaveBeenNthCalledWith(1, "progression_goals");
    expect(supabase.from).toHaveBeenNthCalledWith(2, "progression_goals");
    expect(supabase.from).toHaveBeenNthCalledWith(3, "progression_actions");
    expect(supabase.from).toHaveBeenNthCalledWith(4, "progression_checkins");
    expect(supabase.from).toHaveBeenNthCalledWith(5, "progression_actions");
    expect(supabase.from).toHaveBeenNthCalledWith(6, "progression_actions");
    expect(supabase.from).toHaveBeenNthCalledWith(7, "progression_actions");
  });

  it("delegates check-in create and undo to idempotent RPCs", async () => {
    const { createProgressionCheckin, undoProgressionCheckin } = await import(
      "./progression.service"
    );
    const supabase = createSupabase([
      { data: { user_id: userId, total_xp: 10, level: 2 }, error: null },
      { data: { timezone: "Europe/Rome" }, error: null },
      { data: { id: actionId, title: "Practice scales" }, error: null },
      { data: { user_id: userId, total_xp: 10, level: 2 }, error: null },
      { data: { timezone: "Europe/Rome" }, error: null },
    ]);
    supabase.rpc
      .mockResolvedValueOnce({ data: { id: checkinId, action_id: actionId }, error: null })
      .mockResolvedValueOnce({ data: { id: checkinId, action_id: actionId }, error: null });

    await expect(
      createProgressionCheckin(supabase as never, userId, actionId),
    ).resolves.toMatchObject({
      success: true,
      checkin: { id: checkinId },
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(
      1,
      "progression_create_checkin",
      expect.objectContaining({
        p_description: "Check-in: Practice scales",
      }),
    );
    await expect(
      undoProgressionCheckin(supabase as never, userId, checkinId),
    ).resolves.toMatchObject({
      success: true,
      checkin: { id: checkinId },
    });
  });

  it("resolves deadlines by completion, failure, or one-time postponement", async () => {
    const { resolveExpiredProgressionGoal } = await import("./progression.service");
    const completeSupabase = createSupabase([], { data: openGoal, error: null });
    const failSupabase = createSupabase([], { data: { ...openGoal, status: "failed" }, error: null });
    const postponeSupabase = createSupabase([
      { data: openGoal, error: null },
      { data: { ...openGoal, deadline: "2026-05-10", deadline_change_count: 1 }, error: null },
    ]);

    await expect(
      resolveExpiredProgressionGoal(completeSupabase as never, userId, {
        goalId,
        action: "complete",
      }),
    ).resolves.toMatchObject({ success: true, goal: { id: goalId } });
    await expect(
      resolveExpiredProgressionGoal(failSupabase as never, userId, {
        goalId,
        action: "fail",
      }),
    ).resolves.toMatchObject({ success: true, goal: { status: "failed" } });
    await expect(
      resolveExpiredProgressionGoal(postponeSupabase as never, userId, {
        goalId,
        action: "postpone",
        newDeadline: "2026-05-10",
      }),
    ).resolves.toMatchObject({
      success: true,
      goal: { deadline: "2026-05-10", deadline_change_count: 1 },
    });
  });
});
