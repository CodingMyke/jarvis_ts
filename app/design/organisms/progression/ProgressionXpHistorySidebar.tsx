"use client";

import { useEffect, useState } from "react";
import { getProgressionXpHistory } from "@/app/_features/progression/lib/progression-client";
import { Button } from "@/app/design/atoms/shared/Button";
import { CloseIcon } from "@/app/design/atoms/shared/icons";

interface ProgressionXpHistoryItem {
  id: string;
  description: string | null;
  xpAmount: number;
  createdAt: string;
}

interface ProgressionXpHistorySidebarProps {
  open: boolean;
  onClose: () => void;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeHistory(values: unknown[]): ProgressionXpHistoryItem[] {
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
    .filter((value): value is ProgressionXpHistoryItem => value !== null && value.id.length > 0);
}

export function ProgressionXpHistorySidebar({
  open,
  onClose,
}: ProgressionXpHistorySidebarProps) {
  const [history, setHistory] = useState<ProgressionXpHistoryItem[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    if (!open) {
      return;
    }

    let isCancelled = false;

    async function loadHistory(): Promise<void> {
      setStatus("loading");
      const result = await getProgressionXpHistory({ limit: 50, offset: 0 });

      if (isCancelled) {
        return;
      }

      if (!result.success) {
        setStatus("error");
        return;
      }

      setHistory(normalizeHistory(result.history));
      setStatus("ready");
    }

    void loadHistory();

    return () => {
      isCancelled = true;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  function formatTimestamp(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("it-IT", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  return (
    <aside
      data-testid="progression-xp-history"
      className="fixed inset-y-0 right-0 z-40 w-full max-w-md rounded-app border-l border-line bg-overlay p-4 shadow-[-24px_0_60px_rgba(0,0,0,0.4)]"
    >
      <div className="flex items-center justify-between gap-4 border-b border-line pb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-foreground">Cronologia XP</h2>
          {status === "loading" ? (
            <span role="status" aria-label="Caricamento cronologia in corso">
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 animate-spin text-muted"
              >
                <path d="M12 3a9 9 0 1 0 9 9" />
              </svg>
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          aria-label="Chiudi cronologia XP"
          className="h-7 w-7 !p-0"
        >
          <CloseIcon className="h-5 w-5" />
        </Button>
      </div>

      {status === "error" ? <p className="mt-5 text-sm text-muted">Errore nel caricamento della cronologia.</p> : null}

      <div className="mt-4 space-y-2.5">
        {history.map((entry) => (
          <article
            key={entry.id}
            className="rounded-app border border-line bg-field px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium leading-5 text-foreground">
                {entry.description ?? "Evento XP"}
              </p>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  entry.xpAmount < 0
                    ? "bg-red-500/15 text-red-100"
                    : "bg-cyan-400/10 text-cyan-100"
                }`}
              >
                {entry.xpAmount < 0 ? "-" : "+"}{Math.abs(entry.xpAmount)} XP
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-muted">
              {formatTimestamp(entry.createdAt)}
            </p>
          </article>
        ))}
      </div>
    </aside>
  );
}
