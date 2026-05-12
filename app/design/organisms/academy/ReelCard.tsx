"use client";

import { useRef } from "react";
import { TrashIcon } from "@/app/design/atoms/shared";
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
  const suppressEditRef = useRef(false);

  const handleOpenEdit = (): void => {
    if (suppressEditRef.current) {
      return;
    }

    onEdit(reel);
  };

  return (
    <article
      draggable
      data-testid={`reel-card-${reel.id}`}
      className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5"
      onClick={handleOpenEdit}
      onDragStart={() => {
        suppressEditRef.current = true;
        onDragStart(reel.id);
      }}
      onDragEnd={() => {
        onDragEnd();
        window.setTimeout(() => {
          suppressEditRef.current = false;
        }, 0);
      }}
    >
      <span
        title={reel.title ?? reel.idea}
        className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight text-foreground"
      >
        {reel.title ?? reel.idea}
      </span>

      <button
        type="button"
        className={[
          "ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          "border border-white/10 bg-white/5 px-0 text-muted transition-colors",
          "hover:bg-white/10 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20",
        ].join(" ")}
        onClick={(event) => {
          event.stopPropagation();
          onDelete(reel);
        }}
      >
        <span className="sr-only">Delete reel</span>
        <TrashIcon className="h-3.5 w-3.5" />
      </button>
    </article>
  );
}
