import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/app/_server/supabase/database.types";
import { getLevelProgress } from "./progression-leveling";
import {
  getIsoWeekdayForTimezone,
  getLocalDateForTimezone,
  getWeekRangeForLocalDate,
} from "./progression-dates";
import type {
  ProgressionActionRow,
  ProgressionCheckinRow,
  ProgressionGoalRow,
  ProgressionProfileRow,
  ProgressionXpHistoryRow,
} from "./progression.types";
import type {
  ProgressionDeadlineReviewBody,
  ProgressionGoalCreateBody,
  ProgressionGoalUpdateBody,
  ProgressionOverviewQuery,
  ProgressionXpHistoryQuery,
} from "./progression-route.schemas";

type ProgressionSupabase = SupabaseClient<Database>;
type ProgressionResult<T extends object = object> =
  | ({ success: true } & T)
  | { success: false; error: string };

export interface ProgressionOverview {
  profile: ProgressionProfileRow;
  goals: ProgressionGoalRow[];
  actions: ProgressionActionRow[];
  checkins: ProgressionCheckinRow[];
  expiredGoals: ProgressionGoalRow[];
  xpHistory: ProgressionXpHistoryRow[];
  todayLocalDate: string;
  isoWeekday: number;
  weekStart: string;
  weekEnd: string;
  deadlineWarning: boolean;
  levelProgress: ReturnType<typeof getLevelProgress>;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function isClosedGoal(goal: ProgressionGoalRow): boolean {
  return goal.status === "completed" || goal.status === "failed";
}

function getNowIso(): string {
  return new Date().toISOString();
}

function getActionDescription(description: string | null | undefined): string | null {
  const trimmed = description?.trim();
  return trimmed ? trimmed : null;
}

async function getProfile(
  supabase: ProgressionSupabase,
  userId: string,
): Promise<ProgressionResult<{ profile: ProgressionProfileRow }>> {
  const { data, error } = await supabase
    .from("progression_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { success: false, error: getErrorMessage(error, "Profile load failed.") };
  }

  if (!data) {
    return ensureProgressionProfile(supabase, "UTC");
  }

  return { success: true, profile: data as ProgressionProfileRow };
}

async function getGoalById(
  supabase: ProgressionSupabase,
  userId: string,
  goalId: string,
): Promise<ProgressionResult<{ goal: ProgressionGoalRow }>> {
  const { data, error } = await supabase
    .from("progression_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("id", goalId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return { success: false, error: getErrorMessage(error, "Goal load failed.") };
  }

  if (!data) {
    return { success: false, error: "Goal not found." };
  }

  return { success: true, goal: data as ProgressionGoalRow };
}

function toActionInsert(
  userId: string,
  goalId: string,
  input: NonNullable<ProgressionGoalCreateBody["actions"]>[number],
) {
  return {
    user_id: userId,
    goal_id: goalId,
    title: input.title,
    description: getActionDescription(input.description),
    frequency_type: input.frequencyType,
    frequency_config: input.frequencyConfig as Json,
    xp_per_checkin: input.xpPerCheckin,
    active: input.active ?? true,
    deactivated_at: input.active === false ? getNowIso() : null,
  };
}

export async function ensureProgressionProfile(
  supabase: ProgressionSupabase,
  timezone: string,
): Promise<ProgressionResult<{ profile: ProgressionProfileRow }>> {
  const { data, error } = await supabase.rpc("progression_ensure_profile", {
    p_timezone: timezone,
  });

  if (error || !data) {
    return { success: false, error: getErrorMessage(error, "Profile creation failed.") };
  }

  return { success: true, profile: data as ProgressionProfileRow };
}

export async function getProgressionOverview(
  supabase: ProgressionSupabase,
  userId: string,
  options: ProgressionOverviewQuery = {},
): Promise<ProgressionResult<{ overview: ProgressionOverview }>> {
  const profileResult = await getProfile(supabase, userId);
  if (!profileResult.success) {
    return profileResult;
  }

  const profile = profileResult.profile;
  const todayLocalDate = options.today ?? getLocalDateForTimezone(new Date(), profile.timezone);
  const isoWeekday = getIsoWeekdayForTimezone(new Date(`${todayLocalDate}T12:00:00.000Z`), "UTC");
  const { start: weekStart, end: weekEnd } = getWeekRangeForLocalDate(todayLocalDate);

  let goalsQuery = supabase
    .from("progression_goals")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (options.status && options.status !== "all") {
    goalsQuery = goalsQuery.eq("status", options.status);
  }

  const { data: goalsData, error: goalsError } = await goalsQuery.order("created_at", {
    ascending: false,
  });

  if (goalsError) {
    return { success: false, error: getErrorMessage(goalsError, "Goals load failed.") };
  }

  const goals = (goalsData ?? []) as ProgressionGoalRow[];
  const goalIds = goals.map((goal) => goal.id);

  const { data: actionsData, error: actionsError } = await supabase
    .from("progression_actions")
    .select("*")
    .eq("user_id", userId)
    .in("goal_id", goalIds.length > 0 ? goalIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: true });

  if (actionsError) {
    return { success: false, error: getErrorMessage(actionsError, "Actions load failed.") };
  }

  const { data: checkinsData, error: checkinsError } = await supabase
    .from("progression_checkins")
    .select("*")
    .eq("user_id", userId)
    .gte("local_date", weekStart)
    .lte("local_date", todayLocalDate)
    .order("local_date", { ascending: false });

  if (checkinsError) {
    return { success: false, error: getErrorMessage(checkinsError, "Check-ins load failed.") };
  }

  const { data: expiredData, error: expiredError } = await supabase
    .from("progression_goals")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .lt("deadline", todayLocalDate)
    .neq("status", "completed")
    .neq("status", "failed")
    .order("deadline", { ascending: true });

  if (expiredError) {
    return { success: false, error: getErrorMessage(expiredError, "Deadline load failed.") };
  }

  const { data: historyData, error: historyError } = await supabase
    .from("progression_xp_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(0, 29);

  if (historyError) {
    return { success: false, error: getErrorMessage(historyError, "XP history load failed.") };
  }

  const expiredGoals = (expiredData ?? []) as ProgressionGoalRow[];

  return {
    success: true,
    overview: {
      profile,
      goals,
      actions: (actionsData ?? []) as ProgressionActionRow[],
      checkins: (checkinsData ?? []) as ProgressionCheckinRow[],
      expiredGoals,
      xpHistory: (historyData ?? []) as ProgressionXpHistoryRow[],
      todayLocalDate,
      isoWeekday,
      weekStart,
      weekEnd,
      deadlineWarning: expiredGoals.length > 0,
      levelProgress: getLevelProgress(profile.total_xp),
    },
  };
}

export async function createProgressionGoal(
  supabase: ProgressionSupabase,
  userId: string,
  input: ProgressionGoalCreateBody,
): Promise<ProgressionResult<{ goal: ProgressionGoalRow; actions: ProgressionActionRow[] }>> {
  const now = getNowIso();
  const { data: goalData, error: goalError } = await supabase
    .from("progression_goals")
    .insert({
      user_id: userId,
      title: input.title,
      description: getActionDescription(input.description),
      deadline: input.deadline ?? null,
      completion_xp: input.completionXp,
      status: input.startNow ? "in_progress" : "to_start",
      started_at: input.startNow ? now : null,
    })
    .select("*")
    .single();

  if (goalError || !goalData) {
    return { success: false, error: getErrorMessage(goalError, "Goal creation failed.") };
  }

  const goal = goalData as ProgressionGoalRow;
  const actionInputs = input.actions ?? [];
  if (actionInputs.length === 0) {
    return { success: true, goal, actions: [] };
  }

  const { data: actionsData, error: actionsError } = await supabase
    .from("progression_actions")
    .insert(actionInputs.map((action) => toActionInsert(userId, goal.id, action)))
    .select("*");

  if (actionsError) {
    return { success: false, error: getErrorMessage(actionsError, "Action creation failed.") };
  }

  return {
    success: true,
    goal,
    actions: (actionsData ?? []) as ProgressionActionRow[],
  };
}

export async function updateProgressionGoal(
  supabase: ProgressionSupabase,
  userId: string,
  input: ProgressionGoalUpdateBody,
): Promise<ProgressionResult<{ goal: ProgressionGoalRow }>> {
  const currentResult = await getGoalById(supabase, userId, input.id);
  if (!currentResult.success) {
    return currentResult;
  }

  const current = currentResult.goal;
  const nonTextEdit = input.deadline !== undefined || input.completionXp !== undefined
    || input.actions !== undefined;

  if (isClosedGoal(current) && nonTextEdit) {
    return {
      success: false,
      error: "Closed goals only support title and description edits.",
    };
  }

  if (
    current.deadline !== null
    && input.deadline !== undefined
    && input.deadline !== null
    && input.deadline !== current.deadline
    && current.deadline_change_count >= 1
  ) {
    return { success: false, error: "Goal deadline can only be changed once." };
  }

  const deadlineChanged = current.deadline !== null
    && input.deadline !== undefined
    && input.deadline !== null
    && input.deadline !== current.deadline;

  const update: Database["public"]["Tables"]["progression_goals"]["Update"] = {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined
      ? { description: getActionDescription(input.description) }
      : {}),
    ...(input.deadline !== undefined ? { deadline: input.deadline } : {}),
    ...(input.completionXp !== undefined ? { completion_xp: input.completionXp } : {}),
    ...(deadlineChanged ? { deadline_change_count: current.deadline_change_count + 1 } : {}),
  };

  const { data, error } = await supabase
    .from("progression_goals")
    .update(update)
    .eq("user_id", userId)
    .eq("id", input.id)
    .select("*")
    .single();

  if (error || !data) {
    return { success: false, error: getErrorMessage(error, "Goal update failed.") };
  }

  return { success: true, goal: data as ProgressionGoalRow };
}

export async function duplicateProgressionGoal(
  supabase: ProgressionSupabase,
  userId: string,
  goalId: string,
): Promise<ProgressionResult<{ goal: ProgressionGoalRow; actions: ProgressionActionRow[] }>> {
  const currentResult = await getGoalById(supabase, userId, goalId);
  if (!currentResult.success) {
    return currentResult;
  }

  const { data: actionsData, error: actionsError } = await supabase
    .from("progression_actions")
    .select("*")
    .eq("user_id", userId)
    .eq("goal_id", goalId)
    .order("created_at", { ascending: true });

  if (actionsError) {
    return { success: false, error: getErrorMessage(actionsError, "Action load failed.") };
  }

  return createProgressionGoal(supabase, userId, {
    title: `${currentResult.goal.title} copy`,
    description: currentResult.goal.description,
    deadline: currentResult.goal.deadline,
    completionXp: currentResult.goal.completion_xp,
    actions: ((actionsData ?? []) as ProgressionActionRow[]).map((action) => ({
      title: action.title,
      description: action.description,
      frequencyType: action.frequency_type as "daily" | "specific_weekdays" | "weekly_count",
      frequencyConfig: action.frequency_config as never,
      xpPerCheckin: action.xp_per_checkin,
      active: action.active,
    })),
  });
}

export async function startProgressionGoal(
  supabase: ProgressionSupabase,
  userId: string,
  goalId: string,
): Promise<ProgressionResult<{ goal: ProgressionGoalRow }>> {
  const { data, error } = await supabase
    .from("progression_goals")
    .update({ status: "in_progress", started_at: getNowIso() })
    .eq("user_id", userId)
    .eq("id", goalId)
    .eq("status", "to_start")
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error || !data) {
    return { success: false, error: getErrorMessage(error, "Goal start failed.") };
  }

  return { success: true, goal: data as ProgressionGoalRow };
}

export async function completeProgressionGoal(
  supabase: ProgressionSupabase,
  userId: string,
  goalId: string,
): Promise<ProgressionResult<{ goal: ProgressionGoalRow }>> {
  void userId;
  const { data, error } = await supabase.rpc("progression_complete_goal", {
    p_goal_id: goalId,
    p_description: "Completed goal",
  });

  if (error || !data) {
    return { success: false, error: getErrorMessage(error, "Goal completion failed.") };
  }

  return { success: true, goal: data as ProgressionGoalRow };
}

export async function softDeleteProgressionGoal(
  supabase: ProgressionSupabase,
  userId: string,
  goalId: string,
): Promise<ProgressionResult<{ goal: ProgressionGoalRow }>> {
  const { data, error } = await supabase
    .from("progression_goals")
    .update({ deleted_at: getNowIso() })
    .eq("user_id", userId)
    .eq("id", goalId)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error || !data) {
    return { success: false, error: getErrorMessage(error, "Goal deletion failed.") };
  }

  return { success: true, goal: data as ProgressionGoalRow };
}

export async function createProgressionCheckin(
  supabase: ProgressionSupabase,
  userId: string,
  actionId: string,
): Promise<ProgressionResult<{ checkin: ProgressionCheckinRow }>> {
  const profileResult = await getProfile(supabase, userId);
  if (!profileResult.success) {
    return profileResult;
  }

  const today = getLocalDateForTimezone(new Date(), profileResult.profile.timezone);
  const { data, error } = await supabase.rpc("progression_create_checkin", {
    p_action_id: actionId,
    p_local_date: today,
    p_timezone: profileResult.profile.timezone,
    p_description: "Action check-in",
  });

  if (error || !data) {
    return { success: false, error: getErrorMessage(error, "Check-in failed.") };
  }

  return { success: true, checkin: data as ProgressionCheckinRow };
}

export async function undoProgressionCheckin(
  supabase: ProgressionSupabase,
  userId: string,
  checkinId: string,
): Promise<ProgressionResult<{ checkin: ProgressionCheckinRow }>> {
  const profileResult = await getProfile(supabase, userId);
  if (!profileResult.success) {
    return profileResult;
  }

  const today = getLocalDateForTimezone(new Date(), profileResult.profile.timezone);
  const { data, error } = await supabase.rpc("progression_undo_checkin", {
    p_checkin_id: checkinId,
    p_local_date: today,
    p_timezone: profileResult.profile.timezone,
    p_description: "Undo check-in",
  });

  if (error || !data) {
    return { success: false, error: getErrorMessage(error, "Check-in undo failed.") };
  }

  return { success: true, checkin: data as ProgressionCheckinRow };
}

export async function resolveExpiredProgressionGoal(
  supabase: ProgressionSupabase,
  userId: string,
  input: ProgressionDeadlineReviewBody,
): Promise<ProgressionResult<{ goal: ProgressionGoalRow }>> {
  if (input.action === "complete") {
    return completeProgressionGoal(supabase, userId, input.goalId);
  }

  if (input.action === "fail") {
    const { data, error } = await supabase.rpc("progression_fail_goal", {
      p_goal_id: input.goalId,
      p_description: "Deadline failure penalty",
    });

    if (error || !data) {
      return { success: false, error: getErrorMessage(error, "Goal failure failed.") };
    }

    return { success: true, goal: data as ProgressionGoalRow };
  }

  const currentResult = await getGoalById(supabase, userId, input.goalId);
  if (!currentResult.success) {
    return currentResult;
  }

  if (currentResult.goal.deadline_change_count >= 1) {
    return { success: false, error: "Goal deadline can only be changed once." };
  }

  const { data, error } = await supabase
    .from("progression_goals")
    .update({
      deadline: input.newDeadline,
      deadline_change_count: currentResult.goal.deadline_change_count + 1,
    })
    .eq("user_id", userId)
    .eq("id", input.goalId)
    .select("*")
    .single();

  if (error || !data) {
    return { success: false, error: getErrorMessage(error, "Goal postponement failed.") };
  }

  return { success: true, goal: data as ProgressionGoalRow };
}

export async function getProgressionXpHistory(
  supabase: ProgressionSupabase,
  userId: string,
  options: ProgressionXpHistoryQuery = { limit: 30, offset: 0 },
): Promise<ProgressionResult<{ history: ProgressionXpHistoryRow[] }>> {
  const from = options.offset;
  const to = options.offset + options.limit - 1;
  const { data, error } = await supabase
    .from("progression_xp_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return { success: false, error: getErrorMessage(error, "XP history load failed.") };
  }

  return { success: true, history: (data ?? []) as ProgressionXpHistoryRow[] };
}
