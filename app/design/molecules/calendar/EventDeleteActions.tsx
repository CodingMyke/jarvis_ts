import type { MouseEventHandler } from "react";
import { TrashIcon } from "@/app/design/atoms/shared";

interface EventDeleteActionsProps {
  eventTitle: string;
  onDelete: MouseEventHandler<HTMLButtonElement>;
  onMouseDown: MouseEventHandler<HTMLButtonElement>;
}

export function EventDeleteActions({
  eventTitle,
  onDelete,
  onMouseDown,
}: EventDeleteActionsProps) {
  return (
    <div className="mt-3 flex items-center justify-end gap-3 border-t border-white/10 pt-2">
      <button
        type="button"
        onClick={onDelete}
        onMouseDown={onMouseDown}
        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-white/10 hover:text-red-400"
        aria-label={`Elimina evento ${eventTitle}`}
      >
        <TrashIcon className="h-3.5 w-3.5" />
        <span>Elimina</span>
      </button>
    </div>
  );
}
