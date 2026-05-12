"use client";

import Link from "next/link";
import type { ReelRow, ReelStatus } from "@/app/_features/academy/reels";
import { ReelCard } from "./ReelCard";

export interface ReelKanbanColumnProps {
  title: string;
  status: ReelStatus;
  reels: ReelRow[];
  showPublishedLink?: boolean;
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
      className="min-h-56 rounded-[28px] border border-white/10 bg-white/5 p-4"
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
