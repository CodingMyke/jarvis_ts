"use client";

import { useTodos } from "./TodoContext";
import { useTimer } from "./TimerContext";
import type { Todo } from "@/app/lib/todo";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const handleToggle = () => {
    onToggle(todo.id);
  };

  const handleDelete = () => {
    onDelete(todo.id);
  };

  return (
    <div className="flex items-start gap-3 py-2">
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
          todo.completed
            ? "border-accent bg-accent/20"
            : "border-white/20 bg-transparent hover:border-white/40"
        }`}
        aria-label={todo.completed ? "Segna come non completato" : "Segna come completato"}
      >
        {todo.completed && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </button>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-relaxed wrap-break-word ${
            todo.completed
              ? "text-muted line-through"
              : "text-foreground"
          }`}
        >
          {todo.text}
        </p>
      </div>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-white/10 hover:text-red-400"
        aria-label="Elimina todo"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

export function TodoList() {
  const { todos, updateTodo, deleteTodo } = useTodos();
  const { timer } = useTimer();

  // Non mostrare se non ci sono todo
  if (todos.length === 0) {
    return null;
  }

  const handleToggle = (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      updateTodo(id, { completed: !todo.completed });
    }
  };

  const handleDelete = (id: string) => {
    deleteTodo(id);
  };

  const pendingTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);

  // Calcola il top in base alla presenza del timer
  // Timer è alto circa 6rem (96px) + padding top (24px) = 120px
  // Se c'è il timer, la todo list parte da 120px + 24px (gap) = 144px
  // Se non c'è il timer, la todo list parte da 24px (top-6)
  const topOffset = timer ? "calc(6rem + 48px)" : "24px";
  
  // Calcola l'altezza massima considerando:
  // - Lo spazio sopra (topOffset)
  // - Lo spazio per la chat chiusa in basso (220px + 24px bottom = 244px)
  // - Padding e margini (circa 48px)
  // La chat aperta ha z-index più alto quindi coprirà comunque la todo list
  const topOffsetValue = timer ? 144 : 24;
  const maxHeight = `calc(100vh - ${topOffsetValue}px - 244px - 48px)`;

  return (
    <div 
      className="glass absolute right-6 z-10 w-[380px] rounded-lg px-4 py-3 shadow-lg" 
      style={{ top: topOffset }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Cose da fare</h3>
          <p className="text-xs text-muted">
            {pendingTodos.length} {pendingTodos.length === 1 ? "da fare" : "da fare"}
            {completedTodos.length > 0 && ` • ${completedTodos.length} completat${completedTodos.length === 1 ? "o" : "i"}`}
          </p>
        </div>
      </div>

      {/* Todo list - scrollabile */}
      <div className="overflow-y-auto glass-scroll" style={{ maxHeight }}>
        <div className="space-y-1">
          {/* Todo non completati */}
          {pendingTodos.map((todo) => (
            <TodoItem key={todo.id} todo={todo} onToggle={handleToggle} onDelete={handleDelete} />
          ))}

          {/* Separatore se ci sono completati */}
          {completedTodos.length > 0 && pendingTodos.length > 0 && (
            <div className="my-2 border-t border-white/10" />
          )}

          {/* Todo completati */}
          {completedTodos.map((todo) => (
            <TodoItem key={todo.id} todo={todo} onToggle={handleToggle} onDelete={handleDelete} />
          ))}
        </div>
      </div>
    </div>
  );
}
