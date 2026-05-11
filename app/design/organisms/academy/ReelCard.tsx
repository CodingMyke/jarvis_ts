"use client";

import { Button } from "@/app/design/atoms/shared/Button";
import type { ReelRow } from "@/app/_features/academy/reels";

export interface ReelCardProps {
  reel: ReelRow;
  onEdit: (reel: ReelRow) => void;
  onDelete: (reel: ReelRow) => void;
  onDragStart: (reelId: string) => void;
  onDragEnd: () => void;
}

export function ReelCard({
  reel,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
}: ReelCardProps) {
  return (
    <article
      draggable
      data-testid={`reel-card-${reel.id}`}
      className="rounded-2xl border border-white/10 bg-black/20 p-4"
      onDragStart={() => onDragStart(reel.id)}
      onDragEnd={onDragEnd}
    >
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">{reel.status}</p>
        <h3 className="text-sm font-semibold text-foreground">{reel.title ?? reel.idea}</h3>
        <p className="text-sm text-muted">{reel.idea}</p>
      </div>

      <div className="mt-4 flex gap-2">
        <Button type="button" variant="secondary" onClick={() => onEdit(reel)}>
          Edit
        </Button>
        <Button type="button" variant="secondary" onClick={() => onDelete(reel)}>
          Delete
        </Button>
      </div>
    </article>
  );
}
