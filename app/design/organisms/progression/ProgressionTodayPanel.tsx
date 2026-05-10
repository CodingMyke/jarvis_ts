"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createProgressionCheckin,
  undoProgressionCheckin,
} from "@/app/_features/progression/lib/progression-client";
import { getMillisecondsUntilNextLocalMidnight } from "@/app/_features/progression/server/progression-dates";
import { TodoCheckbox } from "@/app/design/atoms/tasks/TodoCheckbox";

export interface ProgressionTodayActionItem {
  id: string;
  title: string;
  goalTitle: string;
  xpValue: number;
  checkinId: string | null;
  pending?: boolean;
}

interface ProgressionTodayPanelProps {
  initialTodayItems: ProgressionTodayActionItem[];
  initialWeeklyItems: ProgressionTodayActionItem[];
  timezone: string;
}

function getErrorMessage(result: { errorMessage?: string; error?: string }): string {
  return result.errorMessage ?? result.error ?? "Progression operation failed.";
}

function replaceItem(
  items: ProgressionTodayActionItem[],
  predicate: (item: ProgressionTodayActionItem) => boolean,
  update: (item: ProgressionTodayActionItem) => ProgressionTodayActionItem,
): ProgressionTodayActionItem[] | null {
  const index = items.findIndex(predicate);
  if (index < 0) {
    return null;
  }

  const nextItems = [...items];
  nextItems[index] = update(nextItems[index]);
  return nextItems;
}

function ProgressionActionList({
  items,
  onCheckIn,
  onUndoCheckIn,
}: {
  items: ProgressionTodayActionItem[];
  onCheckIn: (actionId: string) => void;
  onUndoCheckIn: (checkinId: string) => void;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">Nessuna azione disponibile.</p>;
  }

  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5"
        >
          <div className="flex items-start gap-3">
            <TodoCheckbox
              checked={item.checkinId !== null}
              disabled={item.pending === true}
              ariaLabel={
                item.checkinId ? `Annulla ${item.title}` : `Completa ${item.title}`
              }
              onClick={() =>
                item.checkinId ? onUndoCheckIn(item.checkinId) : onCheckIn(item.id)
              }
            />
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-medium leading-5 ${
                  item.checkinId ? "text-muted line-through" : "text-foreground"
                }`}
              >
                {item.title}
              </p>
              <p className="mt-0.5 text-xs text-muted">{item.goalTitle}</p>
            </div>
            <span className="mt-0.5 shrink-0 rounded-full bg-cyan-400/10 px-2.5 py-1 text-xs text-cyan-100">
              +{item.xpValue} XP
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

export function ProgressionTodayPanel({
  initialTodayItems,
  initialWeeklyItems,
  timezone,
}: ProgressionTodayPanelProps) {
  const router = useRouter();
  const [todayItems, setTodayItems] = useState(initialTodayItems);
  const [weeklyItems, setWeeklyItems] = useState(initialWeeklyItems);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshPage = useCallback((): void => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    setTodayItems(initialTodayItems);
  }, [initialTodayItems]);

  useEffect(() => {
    setWeeklyItems(initialWeeklyItems);
  }, [initialWeeklyItems]);

  useEffect(() => {
    let isCancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function scheduleRefresh(): void {
      timeoutId = setTimeout(() => {
        if (isCancelled) {
          return;
        }

        refreshPage();
        scheduleRefresh();
      }, getMillisecondsUntilNextLocalMidnight(timezone));
    }

    scheduleRefresh();

    return () => {
      isCancelled = true;
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [refreshPage, timezone]);

  async function runCheckin(actionId: string): Promise<void> {
    const previousTodayItems = todayItems;
    const previousWeeklyItems = weeklyItems;
    const nextTodayItems = replaceItem(
      todayItems,
      (item) => item.id === actionId && item.checkinId === null,
      (item) => ({ ...item, checkinId: `optimistic:${actionId}`, pending: true }),
    );
    const nextWeeklyItems = nextTodayItems
      ? null
      : replaceItem(
          weeklyItems,
          (item) => item.id === actionId && item.checkinId === null,
          (item) => ({ ...item, checkinId: `optimistic:${actionId}`, pending: true }),
        );

    if (nextTodayItems) {
      setTodayItems(nextTodayItems);
    } else if (nextWeeklyItems) {
      setWeeklyItems(nextWeeklyItems);
    }

    const result = await createProgressionCheckin(actionId);
    if (!result.success) {
      setTodayItems(previousTodayItems);
      setWeeklyItems(previousWeeklyItems);
      setErrorMessage(getErrorMessage(result));
      return;
    }

    setErrorMessage(null);
    refreshPage();
  }

  async function runUndo(checkinId: string): Promise<void> {
    const previousTodayItems = todayItems;
    const previousWeeklyItems = weeklyItems;
    const nextTodayItems = replaceItem(
      todayItems,
      (item) => item.checkinId === checkinId,
      (item) => ({ ...item, checkinId: null, pending: true }),
    );
    const nextWeeklyItems = nextTodayItems
      ? null
      : replaceItem(
          weeklyItems,
          (item) => item.checkinId === checkinId,
          (item) => ({ ...item, checkinId: null, pending: true }),
        );

    if (nextTodayItems) {
      setTodayItems(nextTodayItems);
    } else if (nextWeeklyItems) {
      setWeeklyItems(nextWeeklyItems);
    }

    const result = await undoProgressionCheckin(checkinId);
    if (!result.success) {
      setTodayItems(previousTodayItems);
      setWeeklyItems(previousWeeklyItems);
      setErrorMessage(getErrorMessage(result));
      return;
    }

    setErrorMessage(null);
    refreshPage();
  }

  return (
    <section className="space-y-4">
      {errorMessage ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/5 p-4">
          <p className="text-sm text-red-100">{errorMessage}</p>
        </div>
      ) : null}

      <div
        data-testid="progression-today-panel"
        className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Azioni di oggi</h2>
            <p className="text-sm text-muted">Check-in rapidi per il lavoro in corso.</p>
          </div>
        </div>
        <ProgressionActionList
          items={todayItems}
          onCheckIn={(actionId) => {
            void runCheckin(actionId);
          }}
          onUndoCheckIn={(checkinId) => {
            void runUndo(checkinId);
          }}
        />
      </div>

      <div
        data-testid="progression-weekly-panel"
        className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"
      >
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-foreground">Disponibili questa settimana</h2>
          <p className="text-sm text-muted">Azioni flessibili con target settimanale.</p>
        </div>
        <ProgressionActionList
          items={weeklyItems}
          onCheckIn={(actionId) => {
            void runCheckin(actionId);
          }}
          onUndoCheckIn={(checkinId) => {
            void runUndo(checkinId);
          }}
        />
      </div>
    </section>
  );
}
