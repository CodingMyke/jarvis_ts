"use client";

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

function GoalActions({
  goal,
  onEditGoal,
  onDuplicateGoal,
  onStartGoal,
  onCompleteGoal,
  onFailGoal,
}: Omit<ProgressionGoalListProps, "goals" | "selectedFilter" | "onSelectFilter" | "onCreateGoal"> & {
  goal: ProgressionGoalListItem;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {goal.status === "to_start" ? (
        <Button type="button" onClick={() => onStartGoal(goal.id)}>
          Avvia
        </Button>
      ) : null}
      {goal.status === "in_progress" ? (
        <>
          <Button type="button" onClick={() => onCompleteGoal(goal.id)}>
            Completa
          </Button>
          <Button type="button" variant="secondary" onClick={() => onFailGoal(goal.id)}>
            Segna fallito
          </Button>
        </>
      ) : null}
      <Button type="button" variant="secondary" onClick={() => onDuplicateGoal(goal.id)}>
        Duplica
      </Button>
      <Button type="button" variant="secondary" onClick={() => onEditGoal(goal.id)}>
        Modifica
      </Button>
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
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-medium text-foreground">{goal.title}</p>
                  {goal.description ? (
                    <p className="mt-2 text-sm text-muted">{goal.description}</p>
                  ) : null}
                </div>
                <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-100">
                  +{goal.completionXp} XP
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
                <span>{FILTER_LABELS[goal.status]}</span>
                {goal.deadline ? <span>Scadenza {goal.deadline}</span> : null}
              </div>
              <GoalActions
                goal={goal}
                onEditGoal={onEditGoal}
                onDuplicateGoal={onDuplicateGoal}
                onStartGoal={onStartGoal}
                onCompleteGoal={onCompleteGoal}
                onFailGoal={onFailGoal}
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
