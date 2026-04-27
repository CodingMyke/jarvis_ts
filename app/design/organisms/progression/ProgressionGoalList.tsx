"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/app/design/atoms/shared/Button";

export type ProgressionGoalFilter = "in_progress" | "to_start" | "completed" | "failed";

export interface ProgressionGoalListItem {
  id: string;
  title: string;
  description: string | null;
  status: ProgressionGoalFilter;
  deadline: string | null;
  completionXp: number;
}

interface ProgressionGoalListProps {
  goals: ProgressionGoalListItem[];
  selectedFilter: ProgressionGoalFilter;
  onSelectFilter: (filter: ProgressionGoalFilter) => void;
  onCreateGoal: () => void;
  onEditGoal: (goalId: string) => void;
  onDuplicateGoal: (goalId: string) => void;
  onDeleteGoal: (goalId: string) => void;
  onStartGoal: (goalId: string) => void;
  onCompleteGoal: (goalId: string) => void;
  onFailGoal: (goalId: string) => void;
}

const FILTER_LABELS: Record<ProgressionGoalFilter, string> = {
  in_progress: "In corso",
  to_start: "Da iniziare",
  completed: "Completati",
  failed: "Falliti",
};

function ThreeDotsIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M10 4.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm0 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm0 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />
    </svg>
  );
}

function GoalActions({
  goal,
  onEditGoal,
  onDuplicateGoal,
  onDeleteGoal,
  onStartGoal,
  onCompleteGoal,
  onFailGoal,
}: Omit<ProgressionGoalListProps, "goals" | "selectedFilter" | "onSelectFilter" | "onCreateGoal"> & {
  goal: ProgressionGoalListItem;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleDocumentMouseDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleDocumentKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);
    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [isOpen]);

  function runAction(action: () => void) {
    setIsOpen(false);
    action();
  }

  const primaryActions: Array<{ label: string; onClick: () => void }> = [];
  const destructiveActions: Array<{ label: string; onClick: () => void }> = [];

  if (goal.status === "to_start") {
    primaryActions.push({
      label: "Avvia",
      onClick: () => runAction(() => onStartGoal(goal.id)),
    });
    destructiveActions.push({
      label: "Elimina",
      onClick: () => runAction(() => onDeleteGoal(goal.id)),
    });
  }

  if (goal.status === "in_progress") {
    primaryActions.push({
      label: "Completa",
      onClick: () => runAction(() => onCompleteGoal(goal.id)),
    });
    destructiveActions.push({
      label: "Segna fallito",
      onClick: () => runAction(() => onFailGoal(goal.id)),
    });
  }

  primaryActions.push(
    {
      label: "Duplica",
      onClick: () => runAction(() => onDuplicateGoal(goal.id)),
    },
    {
      label: "Modifica",
      onClick: () => runAction(() => onEditGoal(goal.id)),
    },
  );

  const hasDivider = primaryActions.length > 0 && destructiveActions.length > 0;

  return (
    <div className="relative mt-4 flex justify-end" ref={menuRef}>
      <Button
        type="button"
        variant="secondary"
        className="h-10 w-10 px-0"
        aria-label={`Apri azioni obiettivo di ${goal.title}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
      >
        <ThreeDotsIcon />
      </Button>
      {isOpen ? (
        <div
          role="menu"
          aria-label={`Azioni obiettivo di ${goal.title}`}
          className="absolute right-0 top-full z-10 mt-2 w-56 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl backdrop-blur"
        >
          {primaryActions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-white/10 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
          {hasDivider ? <div className="my-2 border-t border-white/10" /> : null}
          {destructiveActions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              className="flex w-full items-center rounded-xl bg-red-500/30 px-3 py-2 text-left text-sm text-white transition-colors hover:bg-red-500/45 focus:outline-none focus:ring-2 focus:ring-red-400/30"
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ProgressionGoalList({
  goals,
  selectedFilter,
  onSelectFilter,
  onCreateGoal,
  onEditGoal,
  onDuplicateGoal,
  onDeleteGoal,
  onStartGoal,
  onCompleteGoal,
  onFailGoal,
}: ProgressionGoalListProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Obiettivi</h2>
          <p className="text-sm text-muted">Filtra lo stato e gestisci il ciclo di lavoro.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={onCreateGoal}>
            Nuovo obiettivo
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(
          ["in_progress", "to_start", "completed", "failed"] as ProgressionGoalFilter[]
        ).map((filter) => (
          <button
            key={filter}
            type="button"
            aria-pressed={selectedFilter === filter}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              selectedFilter === filter
                ? "border-cyan-300/50 bg-cyan-400/10 text-cyan-100"
                : "border-white/10 bg-white/5 text-muted hover:bg-white/10 hover:text-foreground"
            }`}
            onClick={() => onSelectFilter(filter)}
          >
            {FILTER_LABELS[filter]}
          </button>
        ))}
      </div>

      {goals.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-black/10 p-6">
          <p className="text-sm text-muted">Nessun obiettivo in corso.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {goals.map((goal) => (
            <article
              key={goal.id}
              data-testid={`progression-goal-${goal.id}`}
              className="rounded-2xl border border-white/8 bg-black/20 p-4"
            >
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-medium text-foreground">{goal.title}</p>
                    <span className="inline-flex shrink-0 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-100">
                      +{goal.completionXp} XP
                    </span>
                  </div>
                  {goal.description ? (
                    <p className="mt-2 text-sm text-muted">{goal.description}</p>
                  ) : null}
                </div>
                <GoalActions
                  goal={goal}
                  onEditGoal={onEditGoal}
                  onDuplicateGoal={onDuplicateGoal}
                  onDeleteGoal={onDeleteGoal}
                  onStartGoal={onStartGoal}
                  onCompleteGoal={onCompleteGoal}
                  onFailGoal={onFailGoal}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
                <span>{FILTER_LABELS[goal.status]}</span>
                {goal.deadline ? <span>Scadenza {goal.deadline}</span> : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
