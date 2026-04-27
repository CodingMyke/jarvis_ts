"use client";

import { Button } from "@/app/design/atoms/shared/Button";

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
    <div className="space-y-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-2xl border border-white/8 bg-black/20 p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="mt-1 text-xs text-muted">{item.goalTitle}</p>
            </div>
            <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-xs text-cyan-100">
              +{item.xpValue} XP
            </span>
          </div>
          <div className="mt-4 flex justify-end">
            {item.checkinId ? (
              <Button
                type="button"
                variant="secondary"
                aria-label={`Annulla ${item.title}`}
                onClick={() => onUndoCheckIn(item.checkinId as string)}
              >
                Annulla {item.title}
              </Button>
            ) : (
              <Button
                type="button"
                aria-label={`Completa ${item.title}`}
                onClick={() => onCheckIn(item.id)}
              >
                Completa {item.title}
              </Button>
            )}
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
