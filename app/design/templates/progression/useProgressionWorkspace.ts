"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useProgressionStore } from "@/app/_features/progression/state/progression.store";
import { getMillisecondsUntilNextLocalMidnight } from "@/app/_features/progression/server/progression-dates";
import { getLevelProgress } from "@/app/_features/progression/server/progression-leveling";
import { getProgressionGoalDetails } from "@/app/_features/progression/lib/progression-client";
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

interface GoalDetailActionRecord {
  id: string;
  title: string;
  description: string | null;
  frequencyType: "daily" | "specific_weekdays" | "weekly_count";
  frequencyConfig: Record<string, unknown>;
  xpPerCheckin: number;
  active: boolean;
}

interface ProgressionWorkspaceResult {
  deadlineGoal: ProgressionDeadlineGoal | null;
  error: string | null;
  filteredGoals: ProgressionGoalListItem[];
  formInitialValue: ProgressionGoalDraft | null;
  formMode: "create" | "edit" | "duplicate";
  formStatus: "idle" | "loading" | "ready" | "error";
  formError: string | null;
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
  deleteGoal: (goalId: string) => void;
  closeGoalDialog: () => void;
  retryGoalFormLoad: () => void;
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

function normalizeVisibleItems(values: unknown[] | undefined): ProgressionTodayActionItem[] {
  return (values ?? [])
    .map<ProgressionTodayActionItem | null>((value) => {
      const record = asObject(value);
      if (!record) {
        return null;
      }

      return {
        id: asString(record.id),
        title: asString(record.title),
        goalTitle: asString(record.goalTitle),
        xpValue: asNumber(record.xpValue),
        checkinId: asNullableString(record.checkinId),
        pending: record.pending === true,
      };
    })
    .filter((value): value is ProgressionTodayActionItem => value !== null && value.id.length > 0);
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

function normalizeGoalDetailActions(values: unknown[] | undefined): GoalDetailActionRecord[] {
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
        frequencyType: asString(record.frequency_type, "daily") as GoalDetailActionRecord["frequencyType"],
        frequencyConfig: asObject(record.frequency_config) ?? {},
        xpPerCheckin: asNumber(record.xp_per_checkin),
        active: record.active !== false,
      };
    })
    .filter((value): value is GoalDetailActionRecord => value !== null && value.id.length > 0);
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

function toGoalDraft(goal: GoalRecord, actions: GoalDetailActionRecord[]): ProgressionGoalDraft {
  return {
    id: goal.id,
    title: goal.title,
    description: goal.description ?? "",
    deadline: goal.deadline ?? "",
    completionXp: goal.completionXp,
    startNow: goal.status === "in_progress",
    status: goal.status,
    actions: actions.map((action) => {
      const frequencyConfig = action.frequencyConfig;
      return {
        id: action.id,
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
      id: action.id,
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
      id: action.id,
      title: action.title,
      description: action.description || null,
      frequencyType: action.frequencyType,
      frequencyConfig: { targetCount: action.targetCount },
      xpPerCheckin: action.xpPerCheckin,
      active: action.active,
    };
  }

  return {
    id: action.id,
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
  const deleteGoal = useProgressionStore((state) => state.deleteGoal);
  const checkIn = useProgressionStore((state) => state.checkIn);
  const undoCheckIn = useProgressionStore((state) => state.undoCheckIn);
  const resolveDeadline = useProgressionStore((state) => state.resolveDeadline);
  const loadHistory = useProgressionStore((state) => state.loadHistory);

  const [selectedFilter, setSelectedFilterState] = useState<ProgressionGoalFilter>("in_progress");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit" | "duplicate">("create");
  const [formInitialValue, setFormInitialValue] = useState<ProgressionGoalDraft | null>(null);
  const [formStatus, setFormStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [requestedGoalId, setRequestedGoalId] = useState<string | null>(null);
  const formRequestIdRef = useRef(0);

  useEffect(() => {
    if (!initialized && status === "idle") {
      void refresh();
    }
  }, [initialized, refresh, status]);

  const goals = normalizeGoals(overview?.goals as unknown[] | undefined);
  const todayItems = normalizeVisibleItems(overview?.todayItems as unknown[] | undefined);
  const weeklyItems = normalizeVisibleItems(overview?.weeklyItems as unknown[] | undefined);
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

  const overviewProfile = asObject(overview?.profile);
  const profileTimezone = asString(overviewProfile?.timezone, "UTC");

  useEffect(() => {
    if (!overview || status !== "ready") {
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        void refresh();
      }
    }, getMillisecondsUntilNextLocalMidnight(profileTimezone));

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [overview, profileTimezone, refresh, status]);

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

  const filteredGoals = toGoalListItems(
    goals.filter((goal) => goal.status === selectedFilter),
  );

  async function loadGoalDetails(goalId: string, mode: "edit" | "duplicate") {
    const requestId = formRequestIdRef.current + 1;
    formRequestIdRef.current = requestId;
    setRequestedGoalId(goalId);
    setFormMode(mode);
    setFormInitialValue(null);
    setFormError(null);
    setFormStatus("loading");
    setIsFormOpen(true);

    const result = await getProgressionGoalDetails(goalId);
    if (formRequestIdRef.current !== requestId) {
      return;
    }

    if (!result.success) {
      setFormStatus("error");
      setFormError(result.errorMessage);
      return;
    }

    const goalRecord = asObject(result.goal);
    if (!goalRecord) {
      setFormStatus("error");
      setFormError("Goal details response is invalid.");
      return;
    }

    const goal = {
      id: asString(goalRecord.id),
      title: asString(goalRecord.title),
      description: asNullableString(goalRecord.description),
      status: asString(goalRecord.status, "to_start") as ProgressionGoalFilter,
      deadline: asNullableString(goalRecord.deadline),
      completionXp: asNumber(goalRecord.completion_xp),
      deadlineChangeCount: asNumber(goalRecord.deadline_change_count),
    };

    if (goal.id.length === 0) {
      setFormStatus("error");
      setFormError("Goal details response is invalid.");
      return;
    }

    const actions = normalizeGoalDetailActions(result.actions as unknown[] | undefined);
    setFormInitialValue(toGoalDraft(goal, actions));
    setFormStatus("ready");
    setFormError(null);
  }

  function openGoalDialog(
    mode: "create" | "edit" | "duplicate",
    goalId?: string,
  ) {
    if (!goalId) {
      formRequestIdRef.current += 1;
      setRequestedGoalId(null);
      setFormMode(mode);
      setFormInitialValue(null);
      setFormError(null);
      setFormStatus("ready");
      setIsFormOpen(true);
      return;
    }

    if (mode === "edit" || mode === "duplicate") {
      void loadGoalDetails(goalId, mode);
    }
  }

  function closeGoalDialog() {
    formRequestIdRef.current += 1;
    setRequestedGoalId(null);
    setIsFormOpen(false);
    setFormInitialValue(null);
    setFormError(null);
    setFormStatus("idle");
  }

  return {
    deadlineGoal,
    error,
    filteredGoals,
    formInitialValue,
    formMode,
    formStatus,
    formError,
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
    deleteGoal: (goalId) => {
      void deleteGoal(goalId);
    },
    closeGoalDialog,
    retryGoalFormLoad: () => {
      if (!requestedGoalId || formMode === "create") {
        return;
      }

      if (formMode === "edit" || formMode === "duplicate") {
        void loadGoalDetails(requestedGoalId, formMode);
      }
    },
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

      closeGoalDialog();
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
      void loadHistory({ limit: 50, offset: 0 });
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
