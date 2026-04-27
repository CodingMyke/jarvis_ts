"use client";

import { TodoCheckbox } from "@/app/design/atoms/tasks/TodoCheckbox";

export interface ProgressionTodayActionItem {
  id: string;
  title: string;
  goalTitle: string;
  xpValue: number;
  checkinId: string | null;
}

interface ProgressionTodayPanelProps {
  todayItems: ProgressionTodayActionItem[];
  weeklyItems: ProgressionTodayActionItem[];
  onCheckIn: (actionId: string) => void;
  onUndoCheckIn: (checkinId: string) => void;
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
  todayItems,
  weeklyItems,
  onCheckIn,
  onUndoCheckIn,
}: ProgressionTodayPanelProps) {
  return (
    <section className="space-y-4">
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
          onCheckIn={onCheckIn}
          onUndoCheckIn={onUndoCheckIn}
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
          onCheckIn={onCheckIn}
          onUndoCheckIn={onUndoCheckIn}
        />
      </div>
    </section>
  );
}
