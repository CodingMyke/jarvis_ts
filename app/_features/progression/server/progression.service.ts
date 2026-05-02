import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/app/_server/supabase/database.types";
import { getLevelProgress } from "./progression-leveling";
import {
  getIsoWeekdayForTimezone,
  getLocalDateForTimezone,
  getWeekRangeForLocalDate,
} from "./progression-dates";
import { isActionDueToday, isWeeklyCountAvailable } from "./progression-frequency";
import type {
  ProgressionActionRow,
  ProgressionCheckinRow,
  ProgressionGoalRow,
  ProgressionGoalStatus,
  ProgressionProfileRow,
  ProgressionStatus,
  ProgressionXpHistoryRow,
  ProgressionVisibleActionItem,
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
  todayItems: ProgressionVisibleActionItem[];
  weeklyItems: ProgressionVisibleActionItem[];
  expiredGoals: ProgressionGoalRow[];
  xpHistory: ProgressionXpHistoryRow[];
  todayLocalDate: string;
  deadlineWarning: boolean;
  levelProgress: ReturnType<typeof getLevelProgress>;
}

export interface ProgressionGoalDetails {
  goal: ProgressionGoalRow;
  actions: ProgressionActionRow[];
}

export interface ProgressionLevelSection {
  profile: ProgressionProfileRow;
  levelProgress: ReturnType<typeof getLevelProgress>;
}

export interface ProgressionTodaySection {
  todayItems: ProgressionVisibleActionItem[];
  weeklyItems: ProgressionVisibleActionItem[];
  todayLocalDate: string;
}

export interface ProgressionDeadlineReview {
  expiredGoals: ProgressionGoalRow[];
  deadlineWarning: boolean;
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

function getCheckinIdForAction(
  checkins: ProgressionCheckinRow[],
  actionId: string,
  localDate: string,
): string | null {
  const checkin = checkins.find((entry) => entry.action_id === actionId && entry.local_date === localDate);
  return checkin ? checkin.id : null;
}

function buildVisibleActionItem(
  action: ProgressionActionRow,
  goal: ProgressionGoalRow,
  checkins: ProgressionCheckinRow[],
  localDate: string,
): ProgressionVisibleActionItem {
  return {
    id: action.id,
    title: action.title,
    goalTitle: goal.title,
    xpValue: action.xp_per_checkin,
    checkinId: getCheckinIdForAction(checkins, action.id, localDate),
  };
}

interface ProgressionDateContext {
  todayLocalDate: string;
  isoWeekday: number;
  weekStart: string;
  weekEnd: string;
}

function getDateContext(timezone: string, today?: string): ProgressionDateContext {
  const todayLocalDate = today ?? getLocalDateForTimezone(new Date(), timezone);
  const isoWeekday = getIsoWeekdayForTimezone(new Date(`${todayLocalDate}T12:00:00.000Z`), "UTC");
  const { start: weekStart, end: weekEnd } = getWeekRangeForLocalDate(todayLocalDate);

  return {
    todayLocalDate,
    isoWeekday,
    weekStart,
    weekEnd,
  };
}

async function loadGoals(
  supabase: ProgressionSupabase,
  userId: string,
  status: ProgressionGoalStatus | "all" = "all",
): Promise<ProgressionResult<{ goals: ProgressionGoalRow[] }>> {
  let query = supabase
    .from("progression_goals")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) {
    return { success: false, error: getErrorMessage(error, "Goals load failed.") };
  }

  return { success: true, goals: (data ?? []) as ProgressionGoalRow[] };
}

async function loadActionsForGoals(
  supabase: ProgressionSupabase,
  userId: string,
  goalIds: string[],
): Promise<ProgressionResult<{ actions: ProgressionActionRow[] }>> {
  const { data, error } = await supabase
    .from("progression_actions")
    .select("*")
    .eq("user_id", userId)
    .in("goal_id", goalIds.length > 0 ? goalIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: true });

  if (error) {
    return { success: false, error: getErrorMessage(error, "Actions load failed.") };
  }

  return { success: true, actions: (data ?? []) as ProgressionActionRow[] };
}

async function loadCheckinsForDateRange(
  supabase: ProgressionSupabase,
  userId: string,
  weekStart: string,
  todayLocalDate: string,
): Promise<ProgressionResult<{ checkins: ProgressionCheckinRow[] }>> {
  const { data, error } = await supabase
    .from("progression_checkins")
    .select("*")
    .eq("user_id", userId)
    .gte("local_date", weekStart)
    .lte("local_date", todayLocalDate)
    .order("local_date", { ascending: false });

  if (error) {
    return { success: false, error: getErrorMessage(error, "Check-ins load failed.") };
  }

  return { success: true, checkins: (data ?? []) as ProgressionCheckinRow[] };
}

async function loadExpiredGoals(
  supabase: ProgressionSupabase,
  userId: string,
  todayLocalDate: string,
): Promise<ProgressionResult<{ expiredGoals: ProgressionGoalRow[] }>> {
  const { data, error } = await supabase
    .from("progression_goals")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .lt("deadline", todayLocalDate)
    .neq("status", "completed")
    .neq("status", "failed")
    .order("deadline", { ascending: true });

  if (error) {
    return { success: false, error: getErrorMessage(error, "Deadline load failed.") };
  }

  return { success: true, expiredGoals: (data ?? []) as ProgressionGoalRow[] };
}

function buildTodaySection(
  goals: ProgressionGoalRow[],
  actions: ProgressionActionRow[],
  checkins: ProgressionCheckinRow[],
  dateContext: ProgressionDateContext,
): ProgressionTodaySection {
  const weekCheckins = checkins.map((checkin) => ({
    actionId: checkin.action_id,
    localDate: checkin.local_date,
  }));
  const goalsById = new Map(goals.map((goal) => [goal.id, goal]));
  const todayItems: ProgressionVisibleActionItem[] = [];
  const weeklyItems: ProgressionVisibleActionItem[] = [];

  for (const action of actions) {
    const goal = goalsById.get(action.goal_id);
    if (!goal || goal.status !== "in_progress" || !action.active) {
      continue;
    }

    const item = buildVisibleActionItem(action, goal, checkins, dateContext.todayLocalDate);

    if (action.frequency_type === "weekly_count") {
      if (
        isWeeklyCountAvailable(
          {
            id: action.id,
            frequencyType: action.frequency_type as "weekly_count",
            frequencyConfig: action.frequency_config,
            active: action.active,
          },
          weekCheckins,
        )
      ) {
        weeklyItems.push(item);
      }
      continue;
    }

    if (
      isActionDueToday(
        {
          id: action.id,
          frequencyType: action.frequency_type as "daily" | "specific_weekdays",
          frequencyConfig: action.frequency_config,
          active: action.active,
        },
        dateContext,
        weekCheckins,
      )
    ) {
      todayItems.push(item);
    }
  }

  return {
    todayItems,
    weeklyItems,
    todayLocalDate: dateContext.todayLocalDate,
  };
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

async function getActionById(
  supabase: ProgressionSupabase,
  userId: string,
  actionId: string,
): Promise<ProgressionResult<{ action: ProgressionActionRow }>> {
  const { data, error } = await supabase
    .from("progression_actions")
    .select("*")
    .eq("user_id", userId)
    .eq("id", actionId)
    .maybeSingle();

  if (error) {
    return { success: false, error: getErrorMessage(error, "Action load failed.") };
  }

  if (!data) {
    return { success: false, error: "Action not found." };
  }

  return { success: true, action: data as ProgressionActionRow };
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

function toActionUpdate(
  input: NonNullable<ProgressionGoalCreateBody["actions"]>[number],
  existingAction: ProgressionActionRow | null = null,
  hasCheckins = false,
) {
  const active = input.active ?? existingAction?.active ?? true;
  const frequencyType = hasCheckins && existingAction
    ? existingAction.frequency_type
    : input.frequencyType;
  const frequencyConfig = hasCheckins && existingAction
    ? existingAction.frequency_config
    : input.frequencyConfig;
  const xpPerCheckin = hasCheckins && existingAction
    ? existingAction.xp_per_checkin
    : input.xpPerCheckin;

  return {
    title: input.title,
    description: getActionDescription(input.description),
    frequency_type: frequencyType,
    frequency_config: frequencyConfig as Json,
    xp_per_checkin: xpPerCheckin,
    active,
    deactivated_at: active ? null : getNowIso(),
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

export async function getProgressionStatus(
  supabase: ProgressionSupabase,
  userId: string,
  timezone: string,
): Promise<ProgressionResult<{ status: ProgressionStatus }>> {
  const profileResult = await ensureProgressionProfile(supabase, timezone);
  if (!profileResult.success) {
    return profileResult;
  }

  const todayLocalDate = getLocalDateForTimezone(new Date(), profileResult.profile.timezone);
  const { data, error } = await supabase
    .from("progression_goals")
    .select("id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .lt("deadline", todayLocalDate)
    .in("status", ["to_start", "in_progress"])
    .limit(1);

  if (error) {
    return { success: false, error: getErrorMessage(error, "Progression status load failed.") };
  }

  return {
    success: true,
    status: (data?.length ?? 0) > 0 ? "WARNING" : "OK",
  };
}

export async function getProgressionLevel(
  supabase: ProgressionSupabase,
  userId: string,
): Promise<ProgressionResult<{ level: ProgressionLevelSection }>> {
  const profileResult = await getProfile(supabase, userId);
  if (!profileResult.success) {
    return profileResult;
  }

  return {
    success: true,
    level: {
      profile: profileResult.profile,
      levelProgress: getLevelProgress(profileResult.profile.total_xp),
    },
  };
}

export async function getProgressionGoals(
  supabase: ProgressionSupabase,
  userId: string,
  options: { status?: ProgressionGoalStatus | "all" } = {},
): Promise<ProgressionResult<{ goals: ProgressionGoalRow[] }>> {
  return loadGoals(supabase, userId, options.status ?? "all");
}

export async function getProgressionToday(
  supabase: ProgressionSupabase,
  userId: string,
  options: { today?: string } = {},
): Promise<ProgressionResult<{ today: ProgressionTodaySection }>> {
  const profileResult = await getProfile(supabase, userId);
  if (!profileResult.success) {
    return profileResult;
  }

  const dateContext = getDateContext(profileResult.profile.timezone, options.today);
  const goalsResult = await loadGoals(supabase, userId, "in_progress");
  if (!goalsResult.success) {
    return goalsResult;
  }

  const actionsResult = await loadActionsForGoals(
    supabase,
    userId,
    goalsResult.goals.map((goal) => goal.id),
  );
  if (!actionsResult.success) {
    return actionsResult;
  }

  const checkinsResult = await loadCheckinsForDateRange(
    supabase,
    userId,
    dateContext.weekStart,
    dateContext.todayLocalDate,
  );
  if (!checkinsResult.success) {
    return checkinsResult;
  }

  return {
    success: true,
    today: buildTodaySection(
      goalsResult.goals,
      actionsResult.actions,
      checkinsResult.checkins,
      dateContext,
    ),
  };
}

export async function getProgressionDeadlineReview(
  supabase: ProgressionSupabase,
  userId: string,
  options: { today?: string } = {},
): Promise<ProgressionResult<{ review: ProgressionDeadlineReview }>> {
  const profileResult = await getProfile(supabase, userId);
  if (!profileResult.success) {
    return profileResult;
  }

  const dateContext = getDateContext(profileResult.profile.timezone, options.today);
  const expiredGoalsResult = await loadExpiredGoals(supabase, userId, dateContext.todayLocalDate);
  if (!expiredGoalsResult.success) {
    return expiredGoalsResult;
  }

  return {
    success: true,
    review: {
      expiredGoals: expiredGoalsResult.expiredGoals,
      deadlineWarning: expiredGoalsResult.expiredGoals.length > 0,
    },
  };
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
  const dateContext = getDateContext(profile.timezone, options.today);
  const goalsResult = await loadGoals(supabase, userId, options.status ?? "all");
  if (!goalsResult.success) {
    return goalsResult;
  }
  const actionsResult = await loadActionsForGoals(
    supabase,
    userId,
    goalsResult.goals.map((goal) => goal.id),
  );
  if (!actionsResult.success) {
    return actionsResult;
  }
  const checkinsResult = await loadCheckinsForDateRange(
    supabase,
    userId,
    dateContext.weekStart,
    dateContext.todayLocalDate,
  );
  if (!checkinsResult.success) {
    return checkinsResult;
  }
  const expiredGoalsResult = await loadExpiredGoals(supabase, userId, dateContext.todayLocalDate);
  if (!expiredGoalsResult.success) {
    return expiredGoalsResult;
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

  const goals = goalsResult.goals;
  const todaySection = buildTodaySection(
    goals,
    actionsResult.actions,
    checkinsResult.checkins,
    dateContext,
  );
  const expiredGoals = expiredGoalsResult.expiredGoals;

  return {
    success: true,
    overview: {
      profile,
      goals,
      todayItems: todaySection.todayItems,
      weeklyItems: todaySection.weeklyItems,
      expiredGoals,
      xpHistory: (historyData ?? []) as ProgressionXpHistoryRow[],
      todayLocalDate: todaySection.todayLocalDate,
      deadlineWarning: expiredGoals.length > 0,
      levelProgress: getLevelProgress(profile.total_xp),
    },
  };
}

export async function getProgressionGoalDetails(
  supabase: ProgressionSupabase,
  userId: string,
  goalId: string,
): Promise<ProgressionResult<{ details: ProgressionGoalDetails }>> {
  const goalResult = await getGoalById(supabase, userId, goalId);
  if (!goalResult.success) {
    return goalResult;
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

  return {
    success: true,
    details: {
      goal: goalResult.goal,
      actions: (actionsData ?? []) as ProgressionActionRow[],
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

  if (input.actions === undefined) {
    return { success: true, goal: data as ProgressionGoalRow };
  }

  const { data: currentActionsData, error: currentActionsError } = await supabase
    .from("progression_actions")
    .select("*")
    .eq("user_id", userId)
    .eq("goal_id", input.id)
    .order("created_at", { ascending: true });

  if (currentActionsError) {
    return { success: false, error: getErrorMessage(currentActionsError, "Action load failed.") };
  }

  const currentActions = (currentActionsData ?? []) as ProgressionActionRow[];
  const currentActionsById = new Map(currentActions.map((action) => [action.id, action]));
  const { data: checkinsData, error: checkinsError } = await supabase
    .from("progression_checkins")
    .select("action_id")
    .eq("user_id", userId)
    .in(
      "action_id",
      currentActions.length > 0 ? currentActions.map((action) => action.id) : [
        "00000000-0000-0000-0000-000000000000",
      ],
    );

  if (checkinsError) {
    return {
      success: false,
      error: getErrorMessage(checkinsError, "Check-in load failed."),
    };
  }

  const actionsWithCheckins = new Set(
    (checkinsData ?? []).map((entry) => (
      typeof entry === "object" && entry !== null && "action_id" in entry
        ? String((entry as { action_id?: unknown }).action_id ?? "")
        : ""
    )).filter((actionId) => actionId.length > 0),
  );
  const submittedActionIds = new Set<string>();

  for (const actionInput of input.actions) {
    const existingAction = actionInput.id ? currentActionsById.get(actionInput.id) : null;

    if (existingAction) {
      submittedActionIds.add(existingAction.id);
      const hasCheckins = actionsWithCheckins.has(existingAction.id);

      const { data: updatedAction, error: updateError } = await supabase
        .from("progression_actions")
        .update(toActionUpdate(actionInput, existingAction, hasCheckins))
        .eq("user_id", userId)
        .eq("goal_id", input.id)
        .eq("id", existingAction.id)
        .select("*")
        .single();

      if (updateError || !updatedAction) {
        return {
          success: false,
          error: getErrorMessage(updateError, "Action update failed."),
        };
      }

      continue;
    }

    const insertPayload = actionInput.id
      ? {
          id: actionInput.id,
          ...toActionInsert(userId, input.id, actionInput),
        }
      : toActionInsert(userId, input.id, actionInput);

    const { data: createdAction, error: createError } = await supabase
      .from("progression_actions")
      .insert(insertPayload)
      .select("*")
      .single();

    if (createError || !createdAction) {
      return {
        success: false,
        error: getErrorMessage(createError, "Action creation failed."),
      };
    }

    submittedActionIds.add((createdAction as ProgressionActionRow).id);
  }

  for (const action of currentActions) {
    if (submittedActionIds.has(action.id)) {
      continue;
    }

    if (!actionsWithCheckins.has(action.id)) {
      const { data: deletedAction, error: deleteError } = await supabase
        .from("progression_actions")
        .delete()
        .eq("user_id", userId)
        .eq("goal_id", input.id)
        .eq("id", action.id)
        .select("*")
        .single();

      if (deleteError || !deletedAction) {
        return {
          success: false,
          error: getErrorMessage(deleteError, "Action deletion failed."),
        };
      }

      continue;
    }

    const { data: deactivatedAction, error: deactivateError } = await supabase
      .from("progression_actions")
      .update({
        active: false,
        deactivated_at: getNowIso(),
      })
      .eq("user_id", userId)
      .eq("goal_id", input.id)
      .eq("id", action.id)
      .select("*")
      .single();

    if (deactivateError || !deactivatedAction) {
      return {
        success: false,
        error: getErrorMessage(deactivateError, "Action update failed."),
      };
    }
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

  const actionResult = await getActionById(supabase, userId, actionId);
  if (!actionResult.success) {
    return actionResult;
  }

  const today = getLocalDateForTimezone(new Date(), profileResult.profile.timezone);
  const { data, error } = await supabase.rpc("progression_create_checkin", {
    p_action_id: actionId,
    p_local_date: today,
    p_timezone: profileResult.profile.timezone,
    p_description: `Check-in: ${actionResult.action.title}`,
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
