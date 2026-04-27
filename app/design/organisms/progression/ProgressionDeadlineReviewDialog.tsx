"use client";

import { useState } from "react";
import { Button } from "@/app/design/atoms/shared/Button";

interface ProgressionDeadlineReviewDialogProps {
  goal: {
    id: string;
    title: string;
    description: string | null;
    deadline: string | null;
    canPostpone: boolean;
  };
  onComplete: (goalId: string) => void;
  onFail: (goalId: string) => void;
  onPostpone: (goalId: string, newDeadline: string) => void;
}

function getNextDeadline(deadline: string | null): string {
  if (!deadline) {
    return "";
  }

  const date = new Date(`${deadline}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function ProgressionDeadlineReviewDialog({
  goal,
  onComplete,
  onFail,
  onPostpone,
}: ProgressionDeadlineReviewDialogProps) {
  const [newDeadline, setNewDeadline] = useState(getNextDeadline(goal.deadline));

  return (
    <div className="mx-auto flex w-full max-w-3xl items-center justify-center py-8">
      <div className="w-full rounded-[32px] border border-amber-300/20 bg-[#16130f] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">Revisione urgente</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Scadenza da risolvere
        </h1>
        <p className="mt-3 text-base text-muted">
          {goal.title}
          {goal.deadline ? ` era in scadenza il ${goal.deadline}.` : "."}
        </p>
        {goal.description ? (
          <p className="mt-2 text-sm text-muted">{goal.description}</p>
        ) : null}

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Button type="button" onClick={() => onComplete(goal.id)}>
            Segna completato
          </Button>
          <Button type="button" variant="secondary" onClick={() => onFail(goal.id)}>
            Conferma fallimento
          </Button>
          {goal.canPostpone ? (
            <div className="flex gap-2">
              <input
                type="date"
                value={newDeadline}
                onChange={(event) => setNewDeadline(event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-foreground outline-none"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (!newDeadline) {
                    return;
                  }

                  onPostpone(goal.id, newDeadline);
                }}
              >
                Posticipa
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
