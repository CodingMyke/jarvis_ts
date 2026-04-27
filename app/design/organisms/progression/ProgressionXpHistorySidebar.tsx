"use client";

import { Button } from "@/app/design/atoms/shared/Button";

interface ProgressionXpHistoryItem {
  id: string;
  description: string | null;
  xpAmount: number;
  createdAt: string;
}

interface ProgressionXpHistorySidebarProps {
  open: boolean;
  history: ProgressionXpHistoryItem[];
  status: "idle" | "loading" | "ready" | "error";
  onClose: () => void;
}

export function ProgressionXpHistorySidebar({
  open,
  history,
  status,
  onClose,
}: ProgressionXpHistorySidebarProps) {
  if (!open) {
    return null;
  }

  return (
    <aside
      data-testid="progression-xp-history"
      className="fixed inset-y-0 right-0 z-40 w-full max-w-md border-l border-white/10 bg-[#0f1218] p-5 shadow-[-24px_0_60px_rgba(0,0,0,0.4)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Cronologia XP</h2>
          <p className="text-sm text-muted">Eventi immutabili registrati dal sistema.</p>
        </div>
        <Button type="button" variant="secondary" onClick={onClose}>
          Chiudi
        </Button>
      </div>

      {status === "loading" ? <p className="mt-5 text-sm text-muted">Caricamento cronologia...</p> : null}
      {status === "error" ? <p className="mt-5 text-sm text-muted">Errore nel caricamento della cronologia.</p> : null}

      <div className="mt-5 space-y-3">
        {history.map((entry) => (
          <article
            key={entry.id}
            className="rounded-2xl border border-white/8 bg-black/20 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">
                {entry.description ?? "Evento XP"}
              </p>
              <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-xs text-cyan-100">
                +{entry.xpAmount} XP
              </span>
            </div>
            <p className="mt-2 text-xs text-muted">{entry.createdAt}</p>
          </article>
        ))}
      </div>
    </aside>
  );
}
