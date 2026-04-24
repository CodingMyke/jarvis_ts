import { TrashIcon } from "@/app/design/atoms/shared";
import { TodoCheckbox } from "@/app/design/atoms/tasks/TodoCheckbox";
import type { Todo } from "@/app/_features/tasks/types";

interface TodoItemProps {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
}

export function TodoItem({
  todo,
  onToggle,
  onDelete,
}: TodoItemProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <TodoCheckbox checked={todo.completed} onClick={onToggle} />

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-relaxed wrap-break-word ${
            todo.completed ? "text-muted line-through" : "text-foreground"
          }`}
        >
          {todo.text}
        </p>
      </div>

      <button
        onClick={onDelete}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-white/10 hover:text-red-400"
        aria-label="Elimina todo"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
