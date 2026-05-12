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
    <div className="ui-divider mt-3 flex items-center justify-end gap-3 border-t pt-2">
      <button
        type="button"
        onClick={onDelete}
        onMouseDown={onMouseDown}
        className="flex items-center gap-2 rounded-app px-2.5 py-1.5 text-xs text-copy-muted transition-colors hover:bg-interactive hover:text-danger"
        aria-label={`Elimina evento ${eventTitle}`}
      >
        <TrashIcon className="h-3.5 w-3.5" />
        <span>Elimina</span>
      </button>
    </div>
  );
}
