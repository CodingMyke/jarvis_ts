"use client";

import Link from "next/link";
import type { ReelRow, ReelStatus } from "@/app/_features/academy/reels";
import { ReelCard } from "./ReelCard";

export interface ReelKanbanColumnProps {
  title: string;
  status: ReelStatus;
  reels: ReelRow[];
  showPublishedLink?: boolean;
  headerActionLabel?: string;
  headerActionBusyLabel?: string;
  isHeaderActionBusy?: boolean;
  onHeaderAction?: () => Promise<void>;
  onEdit: (reel: ReelRow) => void;
  onDelete: (reel: ReelRow) => void;
  onDragStart: (reelId: string) => void;
  onDragEnd: () => void;
  onDropReel: (reelId: string, status: ReelStatus) => Promise<void>;
  draggedReelId: string | null;
}

export function ReelKanbanColumn({
  title,
  status,
  reels,
  showPublishedLink = false,
  headerActionLabel,
  headerActionBusyLabel = "Working...",
  isHeaderActionBusy = false,
  onHeaderAction,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  onDropReel,
  draggedReelId,
}: ReelKanbanColumnProps) {
  return (
    <section
      data-testid={`reel-column-${status}`}
      className="min-h-56 rounded-app border border-line bg-surface-raised p-4"
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => {
        if (draggedReelId) {
          void onDropReel(draggedReelId, status);
        }
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground">{title}</h2>
          <p className="text-xs text-muted">{reels.length} reels</p>
        </div>

        {onHeaderAction && headerActionLabel ? (
          <button
            type="button"
            className="rounded-app border border-line px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void onHeaderAction()}
            disabled={isHeaderActionBusy}
          >
            {isHeaderActionBusy ? headerActionBusyLabel : headerActionLabel}
          </button>
        ) : null}

        {showPublishedLink ? (
          <Link className="text-xs text-accent underline" href="/academy/reels/published">
            Vedi tutti
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {reels.map((reel) => (
          <ReelCard
            key={reel.id}
            reel={reel}
            onEdit={onEdit}
            onDelete={onDelete}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </section>
  );
}
