"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveProgressionDeadline } from "@/app/_features/progression/lib/progression-client";
import { Button } from "@/app/design/atoms/shared/Button";

interface ProgressionDeadlineReviewDialogProps {
  goal: {
    id: string;
    title: string;
    description: string | null;
    deadline: string | null;
    canPostpone: boolean;
  };
}

function getNextDeadline(deadline: string | null): string {
  if (!deadline) {
    return "";
  }

  const date = new Date(`${deadline}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function getErrorMessage(result: { errorMessage?: string; error?: string }): string {
  return result.errorMessage ?? result.error ?? "Progression operation failed.";
}

export function ProgressionDeadlineReviewDialog({
  goal,
}: ProgressionDeadlineReviewDialogProps) {
  const router = useRouter();
  const [newDeadline, setNewDeadline] = useState(getNextDeadline(goal.deadline));
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function refreshPage(): void {
    startTransition(() => {
      router.refresh();
    });
  }

  async function submitResolution(
    action: "complete" | "fail" | "postpone",
    nextDeadline?: string,
  ): Promise<void> {
    setIsPending(true);
    const result = await resolveProgressionDeadline({
      goalId: goal.id,
      action,
      ...(nextDeadline ? { newDeadline: nextDeadline } : {}),
    });
    setIsPending(false);

    if (!result.success) {
      setErrorMessage(getErrorMessage(result));
      return;
    }

    setErrorMessage(null);
    refreshPage();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl items-center justify-center py-8">
      <div className="w-full rounded-app border border-amber-300/20 bg-[#16130f] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
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
        {errorMessage ? (
          <p className="mt-4 text-sm text-red-100">{errorMessage}</p>
        ) : null}

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Button
            type="button"
            disabled={isPending}
            onClick={() => {
              void submitResolution("complete");
            }}
          >
            Segna completato
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => {
              void submitResolution("fail");
            }}
          >
            Conferma fallimento
          </Button>
          {goal.canPostpone ? (
            <div className="flex gap-2">
              <input
                type="date"
                value={newDeadline}
                onChange={(event) => setNewDeadline(event.target.value)}
                className="min-w-0 flex-1 rounded-app border border-line bg-field px-3 py-2 text-sm text-foreground outline-none"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={isPending || !newDeadline}
                onClick={() => {
                  if (!newDeadline) {
                    return;
                  }

                  void submitResolution("postpone", newDeadline);
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
