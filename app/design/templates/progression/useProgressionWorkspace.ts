"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createProgressionGoal,
  deleteProgressionGoal,
  getProgressionGoalDetails,
  runProgressionGoalOperation,
  updateProgressionGoal,
} from "@/app/_features/progression/lib/progression-client";
import type { ProgressionOperationError } from "@/app/_features/progression/lib/progression-client";
import type {
  ProgressionGoalActionDraft,
  ProgressionGoalDraft,
} from "@/app/design/organisms/progression/ProgressionGoalFormDialog";
import type {
  ProgressionGoalFilter,
  ProgressionGoalListItem,
} from "@/app/design/organisms/progression/ProgressionGoalList";

interface GoalRecord {
  id: string;
  title: string;
  description: string | null;
  status: ProgressionGoalFilter;
  deadline: string | null;
  completionXp: number;
}

interface GoalDetailActionRecord {
  id: string;
  title: string;
  description: string | null;
  frequencyType: "daily" | "specific_weekdays" | "weekly_count";
  frequencyConfig: Record<string, unknown>;
  xpPerCheckin: number;
  active: boolean;
  hasHistory: boolean;
}

export interface ProgressionWorkspaceResult {
  filteredGoals: ProgressionGoalListItem[];
  selectedFilter: ProgressionGoalFilter;
  isFormOpen: boolean;
  formMode: "create" | "edit" | "duplicate";
  formInitialValue: ProgressionGoalDraft | null;
  formStatus: "idle" | "loading" | "ready" | "error";
  formError: string | null;
  sectionError: string | null;
  setSelectedFilter: (filter: ProgressionGoalFilter) => void;
  openCreateGoal: () => void;
  openEditGoal: (goalId: string) => void;
  openDuplicateGoal: (goalId: string) => void;
  deleteGoal: (goalId: string) => void;
  startGoal: (goalId: string) => void;
  completeGoal: (goalId: string) => void;
  failGoal: (goalId: string) => void;
  closeGoalDialog: () => void;
  retryGoalFormLoad: () => void;
  submitGoalForm: (value: ProgressionGoalDraft) => void;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
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

function getErrorMessage(result: ProgressionOperationError | { errorMessage?: string; error?: string }): string {
  return result.errorMessage ?? result.error ?? "Progression operation failed.";
}

function normalizeGoals(values: unknown[]): GoalRecord[] {
  return values
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
        hasHistory: record.has_history === true,
      };
    })
    .filter((value): value is GoalDetailActionRecord => value !== null && value.id.length > 0);
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
        hasHistory: action.hasHistory,
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

export function useProgressionWorkspace(initialGoals: unknown[]): ProgressionWorkspaceResult {
  const router = useRouter();
  const [goals, setGoals] = useState<GoalRecord[]>(() => normalizeGoals(initialGoals));
  const [selectedFilter, setSelectedFilter] = useState<ProgressionGoalFilter>("in_progress");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit" | "duplicate">("create");
  const [formInitialValue, setFormInitialValue] = useState<ProgressionGoalDraft | null>(null);
  const [formStatus, setFormStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [requestedGoalId, setRequestedGoalId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setGoals(normalizeGoals(initialGoals));
  }, [initialGoals]);

  function refreshPage(): void {
    startTransition(() => {
      router.refresh();
    });
  }

  function closeGoalDialog(): void {
    setIsFormOpen(false);
    setFormMode("create");
    setFormInitialValue(null);
    setFormStatus("idle");
    setFormError(null);
    setRequestedGoalId(null);
  }

  async function runGoalDetailsLoad(goalId: string, mode: "edit" | "duplicate"): Promise<void> {
    const nextRequestId = requestIdRef.current + 1;
    requestIdRef.current = nextRequestId;
    setRequestedGoalId(goalId);
    setIsFormOpen(true);
    setFormMode(mode);
    setFormInitialValue(null);
    setFormStatus("loading");
    setFormError(null);

    const goal = goals.find((entry) => entry.id === goalId);
    if (!goal) {
      setFormStatus("error");
      setFormError("Goal details are unavailable.");
      return;
    }

    const result = await getProgressionGoalDetails(goalId);
    if (requestIdRef.current !== nextRequestId) {
      return;
    }

    if (!result.success || !result.goal) {
      setFormStatus("error");
      setFormError(result.success ? "Goal details are unavailable." : getErrorMessage(result));
      return;
    }

    setFormInitialValue(
      toGoalDraft(goal, normalizeGoalDetailActions(result.actions as unknown[] | undefined)),
    );
    setFormStatus("ready");
  }

  async function runMutation(
    request: Promise<{ success: true } | ProgressionOperationError>,
  ): Promise<void> {
    const result = await request;
    if (!result.success) {
      setSectionError(getErrorMessage(result));
      return;
    }

    setSectionError(null);
    refreshPage();
  }

  const filteredGoals = toGoalListItems(goals.filter((goal) => goal.status === selectedFilter));

  return {
    filteredGoals,
    selectedFilter,
    isFormOpen,
    formMode,
    formInitialValue,
    formStatus,
    formError,
    sectionError,
    setSelectedFilter,
    openCreateGoal: () => {
      setIsFormOpen(true);
      setFormMode("create");
      setFormInitialValue(null);
      setFormStatus("ready");
      setFormError(null);
      setSectionError(null);
    },
    openEditGoal: (goalId) => {
      void runGoalDetailsLoad(goalId, "edit");
    },
    openDuplicateGoal: (goalId) => {
      void runGoalDetailsLoad(goalId, "duplicate");
    },
    deleteGoal: (goalId) => {
      void runMutation(deleteProgressionGoal(goalId));
    },
    startGoal: (goalId) => {
      void runMutation(runProgressionGoalOperation({ goalId, operation: "start" }));
    },
    completeGoal: (goalId) => {
      void runMutation(runProgressionGoalOperation({ goalId, operation: "complete" }));
    },
    failGoal: (goalId) => {
      void runMutation(runProgressionGoalOperation({ goalId, operation: "fail" }));
    },
    closeGoalDialog,
    retryGoalFormLoad: () => {
      if (requestedGoalId && formMode !== "create") {
        void runGoalDetailsLoad(requestedGoalId, formMode);
      }
    },
    submitGoalForm: (value) => {
      const payload = {
        title: value.title,
        description: value.description || null,
        deadline: value.deadline || null,
        completionXp: value.completionXp,
        actions: value.actions.map(toActionInput),
      };

      const request = formMode === "create" || formMode === "duplicate"
        ? createProgressionGoal({
            ...payload,
            startNow: value.startNow,
          })
        : updateProgressionGoal({
            id: value.id ?? "",
            ...payload,
          });

      void request.then((result) => {
        if (!result.success) {
          setFormStatus("error");
          setFormError(getErrorMessage(result));
          return;
        }

        closeGoalDialog();
        setSectionError(null);
        refreshPage();
      });
    },
  };
}
