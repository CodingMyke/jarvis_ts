"use client";

import { startTransition, useEffect, useState } from "react";
import { getLevelProgress } from "@/app/_features/progression/server/progression-leveling";
import {
  isActionDueToday,
  isWeeklyCountAvailable,
  type ProgressionCheckinSummary,
} from "@/app/_features/progression/server/progression-frequency";
import type { Json } from "@/app/_server/supabase/database.types";
import { useProgressionStore } from "@/app/_features/progression/state/progression.store";
import type {
  ProgressionGoalActionDraft,
  ProgressionGoalDraft,
} from "@/app/design/organisms/progression/ProgressionGoalFormDialog";
import type {
  ProgressionGoalFilter,
  ProgressionGoalListItem,
} from "@/app/design/organisms/progression/ProgressionGoalList";
import type { ProgressionTodayActionItem } from "@/app/design/organisms/progression/ProgressionTodayPanel";

interface ProgressionLevelState {
  level: number;
  totalXp: number;
  xpInCurrentLevel: number;
  xpRequiredForNextLevel: number;
  xpRemainingForNextLevel: number;
}

interface ProgressionDeadlineGoal {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  canPostpone: boolean;
}

interface ProgressionHistoryItem {
  id: string;
  description: string | null;
  xpAmount: number;
  createdAt: string;
}

interface GoalRecord {
  id: string;
  title: string;
  description: string | null;
  status: ProgressionGoalFilter;
  deadline: string | null;
  completionXp: number;
  deadlineChangeCount: number;
}

interface ActionRecord {
  id: string;
  goalId: string;
  title: string;
  description: string | null;
  frequencyType: "daily" | "specific_weekdays" | "weekly_count";
  frequencyConfig: Json;
  xpPerCheckin: number;
  active: boolean;
}

interface CheckinRecord {
  id: string;
  actionId: string;
  localDate: string;
}

interface ProgressionWorkspaceResult {
  deadlineGoal: ProgressionDeadlineGoal | null;
  error: string | null;
  filteredGoals: ProgressionGoalListItem[];
  formInitialValue: ProgressionGoalDraft | null;
  formMode: "create" | "edit" | "duplicate";
  history: ProgressionHistoryItem[];
  historyOpen: boolean;
  historyStatus: "idle" | "loading" | "ready" | "error";
  isFormOpen: boolean;
  levelProgress: ProgressionLevelState;
  selectedFilter: ProgressionGoalFilter;
  status: "idle" | "loading" | "ready" | "error";
  todayItems: ProgressionTodayActionItem[];
  weeklyItems: ProgressionTodayActionItem[];
  openCreateGoal: () => void;
  openEditGoal: (goalId: string) => void;
  openDuplicateGoal: (goalId: string) => void;
  closeGoalDialog: () => void;
  submitGoalForm: (value: ProgressionGoalDraft) => void;
  setSelectedFilter: (filter: ProgressionGoalFilter) => void;
  retry: () => void;
  startGoal: (goalId: string) => void;
  completeGoal: (goalId: string) => void;
  failGoal: (goalId: string) => void;
  checkIn: (actionId: string) => void;
  undoCheckIn: (checkinId: string) => void;
  openHistory: () => void;
  closeHistory: () => void;
  resolveDeadlineComplete: (goalId: string) => void;
  resolveDeadlineFail: (goalId: string) => void;
  resolveDeadlinePostpone: (goalId: string, newDeadline: string) => void;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeGoals(values: unknown[] | undefined): GoalRecord[] {
  return (values ?? [])
    .map((value) => {
      const record = asObject(value);
      if (!record) {
        return null;
      }

      return {
        id: asString(record.id),
        title: asString(record.title),
        description: asNullableString(record.description),
        status: asString(record.status, "to_start") as ProgressionGoalFilter,
        deadline: asNullableString(record.deadline),
        completionXp: asNumber(record.completion_xp),
        deadlineChangeCount: asNumber(record.deadline_change_count),
      };
    })
    .filter((value): value is GoalRecord => value !== null && value.id.length > 0);
}

function normalizeActions(values: unknown[] | undefined): ActionRecord[] {
  return (values ?? [])
    .map((value) => {
      const record = asObject(value);
      if (!record) {
        return null;
      }

      return {
        id: asString(record.id),
        goalId: asString(record.goal_id),
        title: asString(record.title),
        description: asNullableString(record.description),
        frequencyType: asString(record.frequency_type, "daily") as ActionRecord["frequencyType"],
        frequencyConfig: (record.frequency_config ?? {}) as Json,
        xpPerCheckin: asNumber(record.xp_per_checkin),
        active: record.active !== false,
      };
    })
    .filter((value): value is ActionRecord => value !== null && value.id.length > 0);
}

function normalizeCheckins(values: unknown[] | undefined): CheckinRecord[] {
  return (values ?? [])
    .map((value) => {
      const record = asObject(value);
      if (!record) {
        return null;
      }

      return {
        id: asString(record.id),
        actionId: asString(record.action_id),
        localDate: asString(record.local_date),
      };
    })
    .filter((value): value is CheckinRecord => value !== null && value.id.length > 0);
}

function normalizeHistory(values: unknown[]): ProgressionHistoryItem[] {
  return values
    .map((value) => {
      const record = asObject(value);
      if (!record) {
        return null;
      }

      return {
        id: asString(record.id),
        description: asNullableString(record.description),
        xpAmount: asNumber(record.xp_amount),
        createdAt: asString(record.created_at),
      };
    })
    .filter((value): value is ProgressionHistoryItem => value !== null && value.id.length > 0);
}

function toGoalListItems(goals: GoalRecord[]): ProgressionGoalListItem[] {
  return goals.map((goal) => ({
    id: goal.id,
    title: goal.title,
    description: goal.description,
    status: goal.status,
    deadline: goal.deadline,
    completionXp: goal.completionXp,
  }));
}

function toGoalDraft(goal: GoalRecord, actions: ActionRecord[]): ProgressionGoalDraft {
  return {
    id: goal.id,
    title: goal.title,
    description: goal.description ?? "",
    deadline: goal.deadline ?? "",
    completionXp: goal.completionXp,
    startNow: goal.status === "in_progress",
    status: goal.status,
    actions: actions.map((action) => {
      const frequencyConfig = asObject(action.frequencyConfig) ?? {};
      return {
        title: action.title,
        description: action.description ?? "",
        frequencyType: action.frequencyType,
        weekdays: Array.isArray(frequencyConfig.weekdays)
          ? frequencyConfig.weekdays.filter((day): day is number => typeof day === "number")
          : [1, 3, 5],
        targetCount: asNumber(frequencyConfig.targetCount, 3),
        xpPerCheckin: action.xpPerCheckin,
        active: action.active,
      };
    }),
  };
}

function toActionInput(action: ProgressionGoalActionDraft) {
  if (action.frequencyType === "specific_weekdays") {
    return {
      title: action.title,
      description: action.description || null,
      frequencyType: action.frequencyType,
      frequencyConfig: { weekdays: action.weekdays },
      xpPerCheckin: action.xpPerCheckin,
      active: action.active,
    };
  }

  if (action.frequencyType === "weekly_count") {
    return {
      title: action.title,
      description: action.description || null,
      frequencyType: action.frequencyType,
      frequencyConfig: { targetCount: action.targetCount },
      xpPerCheckin: action.xpPerCheckin,
      active: action.active,
    };
  }

  return {
    title: action.title,
    description: action.description || null,
    frequencyType: action.frequencyType,
    frequencyConfig: {},
    xpPerCheckin: action.xpPerCheckin,
    active: action.active,
  };
}

export function useProgressionWorkspace(): ProgressionWorkspaceResult {
  const overview = useProgressionStore((state) => state.overview);
  const status = useProgressionStore((state) => state.status);
  const error = useProgressionStore((state) => state.error);
  const initialized = useProgressionStore((state) => state.initialized);
  const historyValues = useProgressionStore((state) => state.history);
  const historyStatus = useProgressionStore((state) => state.historyStatus);
  const refresh = useProgressionStore((state) => state.refresh);
  const createGoal = useProgressionStore((state) => state.createGoal);
  const updateGoal = useProgressionStore((state) => state.updateGoal);
  const runGoalOperation = useProgressionStore((state) => state.runGoalOperation);
  const checkIn = useProgressionStore((state) => state.checkIn);
  const undoCheckIn = useProgressionStore((state) => state.undoCheckIn);
  const resolveDeadline = useProgressionStore((state) => state.resolveDeadline);
  const loadHistory = useProgressionStore((state) => state.loadHistory);

  const [selectedFilter, setSelectedFilterState] = useState<ProgressionGoalFilter>("in_progress");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit" | "duplicate">("create");
  const [formInitialValue, setFormInitialValue] = useState<ProgressionGoalDraft | null>(null);

  useEffect(() => {
    if (!initialized && status === "idle") {
      void refresh();
    }
  }, [initialized, refresh, status]);

  const goals = normalizeGoals(overview?.goals as unknown[] | undefined);
  const actions = normalizeActions(overview?.actions as unknown[] | undefined);
  const checkins = normalizeCheckins(overview?.checkins as unknown[] | undefined);
  const history = normalizeHistory(
    historyValues.length > 0 ? historyValues : ((overview?.xpHistory as unknown[]) ?? []),
  );

  const levelObject = asObject(overview?.levelProgress);
  const totalXp = asNumber(asObject(overview?.profile)?.total_xp);
  const levelProgress = levelObject
    ? {
        level: asNumber(levelObject.level, 1),
        totalXp: asNumber(levelObject.totalXp, totalXp),
        xpInCurrentLevel: asNumber(levelObject.xpInCurrentLevel),
        xpRequiredForNextLevel: asNumber(levelObject.xpRequiredForNextLevel),
        xpRemainingForNextLevel: asNumber(levelObject.xpRemainingForNextLevel),
      }
    : getLevelProgress(totalXp);

  const goalsById = new Map(goals.map((goal) => [goal.id, goal]));
  const actionsByGoalId = actions.reduce<Map<string, ActionRecord[]>>((map, action) => {
    const current = map.get(action.goalId) ?? [];
    current.push(action);
    map.set(action.goalId, current);
    return map;
  }, new Map());

  const todayLocalDate = asString(overview?.todayLocalDate, "");
  const todayContext = {
    todayLocalDate,
    isoWeekday: asNumber(overview?.isoWeekday, 1),
    weekStart: asString(overview?.weekStart, todayLocalDate),
    weekEnd: asString(overview?.weekEnd, todayLocalDate),
  };
  const weekCheckins: ProgressionCheckinSummary[] = checkins.map((checkin) => ({
    actionId: checkin.actionId,
    localDate: checkin.localDate,
  }));

  const todayItems: ProgressionTodayActionItem[] = [];
  const weeklyItems: ProgressionTodayActionItem[] = [];

  actions.forEach((action) => {
    const goal = goalsById.get(action.goalId);
    if (!goal || goal.status !== "in_progress" || !action.active) {
      return;
    }

    const todayCheckin = checkins.find(
      (checkin) => checkin.actionId === action.id && checkin.localDate === todayContext.todayLocalDate,
    );

    const item = {
      id: action.id,
      title: action.title,
      goalTitle: goal.title,
      xpValue: action.xpPerCheckin,
      checkinId: todayCheckin?.id ?? null,
    };

    if (action.frequencyType === "weekly_count") {
      if (
        isWeeklyCountAvailable(
          {
            id: action.id,
            frequencyType: action.frequencyType,
            frequencyConfig: action.frequencyConfig,
            active: action.active,
          },
          weekCheckins,
        )
      ) {
        weeklyItems.push(item);
      }
      return;
    }

    if (
      isActionDueToday(
        {
          id: action.id,
          frequencyType: action.frequencyType,
          frequencyConfig: action.frequencyConfig,
          active: action.active,
        },
        todayContext,
        weekCheckins,
      )
    ) {
      todayItems.push(item);
    }
  });

  const filteredGoals = toGoalListItems(
    goals.filter((goal) => goal.status === selectedFilter),
  );

  const expiredGoals = normalizeGoals(overview?.expiredGoals as unknown[] | undefined);
  const deadlineGoal = expiredGoals.length > 0
    ? {
        id: expiredGoals[0].id,
        title: expiredGoals[0].title,
        description: expiredGoals[0].description,
        deadline: expiredGoals[0].deadline,
        canPostpone: expiredGoals[0].deadlineChangeCount < 1,
      }
    : null;

  function openGoalDialog(
    mode: "create" | "edit" | "duplicate",
    goalId?: string,
  ) {
    if (!goalId) {
      setFormInitialValue(null);
    } else {
      const goal = goalsById.get(goalId);
      if (!goal) {
        return;
      }
      setFormInitialValue(toGoalDraft(goal, actionsByGoalId.get(goalId) ?? []));
    }

    setFormMode(mode);
    setIsFormOpen(true);
  }

  return {
    deadlineGoal,
    error,
    filteredGoals,
    formInitialValue,
    formMode,
    history,
    historyOpen,
    historyStatus,
    isFormOpen,
    levelProgress,
    selectedFilter,
    status,
    todayItems,
    weeklyItems,
    openCreateGoal: () => openGoalDialog("create"),
    openEditGoal: (goalId) => openGoalDialog("edit", goalId),
    openDuplicateGoal: (goalId) => openGoalDialog("duplicate", goalId),
    closeGoalDialog: () => setIsFormOpen(false),
    submitGoalForm: (value) => {
      const actionsPayload = value.actions
        .filter((action) => action.title.trim().length > 0)
        .map(toActionInput);

      if (formMode === "edit" && value.id) {
        void updateGoal({
          id: value.id,
          title: value.title,
          description: value.description || null,
          deadline: value.deadline || null,
          completionXp: value.completionXp,
          actions: actionsPayload,
        });
      } else {
        void createGoal({
          title: value.title,
          description: value.description || null,
          deadline: value.deadline || null,
          completionXp: value.completionXp,
          startNow: value.startNow,
          actions: actionsPayload,
        });
      }

      setIsFormOpen(false);
    },
    setSelectedFilter: (filter) => {
      startTransition(() => {
        setSelectedFilterState(filter);
      });
    },
    retry: () => {
      void refresh();
    },
    startGoal: (goalId) => {
      void runGoalOperation({ goalId, operation: "start" });
    },
    completeGoal: (goalId) => {
      void runGoalOperation({ goalId, operation: "complete" });
    },
    failGoal: (goalId) => {
      void runGoalOperation({ goalId, operation: "fail" });
    },
    checkIn: (actionId) => {
      void checkIn(actionId);
    },
    undoCheckIn: (checkinId) => {
      void undoCheckIn(checkinId);
    },
    openHistory: () => {
      startTransition(() => {
        setHistoryOpen(true);
      });
      void loadHistory({ limit: 30, offset: 0 });
    },
    closeHistory: () => setHistoryOpen(false),
    resolveDeadlineComplete: (goalId) => {
      void resolveDeadline({ goalId, action: "complete" });
    },
    resolveDeadlineFail: (goalId) => {
      void resolveDeadline({ goalId, action: "fail" });
    },
    resolveDeadlinePostpone: (goalId, newDeadline) => {
      void resolveDeadline({ goalId, action: "postpone", newDeadline });
    },
  };
}
