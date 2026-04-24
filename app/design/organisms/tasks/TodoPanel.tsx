"use client";

import { TodoItem } from "@/app/design/molecules/tasks/TodoItem";
import { TodoListHeader } from "@/app/design/molecules/tasks/TodoListHeader";
import { useTasksStore } from "@/app/_features/tasks/state/tasks.store";
import { useTimerStore } from "@/app/_features/timer/state/timer.store";
import { useTodoPanelLayout } from "./useTodoPanelLayout";

export function TodoPanel() {
  const todos = useTasksStore((state) => state.todos);
  const updateTodo = useTasksStore((state) => state.update);
  const deleteTodo = useTasksStore((state) => state.remove);
  const timer = useTimerStore((state) => state.timer);
  const { topOffset, maxHeight } = useTodoPanelLayout(Boolean(timer));

  if (todos.length === 0) {
    return null;
  }

  const pendingTodos = todos.filter((todo) => !todo.completed);
  const completedTodos = todos.filter((todo) => todo.completed);

  return (
    <div
      className="glass absolute right-6 z-10 w-[380px] rounded-lg px-4 py-3 shadow-lg"
      style={{ top: topOffset }}
    >
      <TodoListHeader
        pendingCount={pendingTodos.length}
        completedCount={completedTodos.length}
      />

      <div className="glass-scroll overflow-y-auto" style={{ maxHeight }}>
        <div className="space-y-1">
          {pendingTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={() => {
                void updateTodo(todo.id, { completed: !todo.completed });
              }}
              onDelete={() => {
                void deleteTodo(todo.id);
              }}
            />
          ))}

          {completedTodos.length > 0 && pendingTodos.length > 0 ? (
            <div className="my-2 border-t border-white/10" />
          ) : null}

          {completedTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={() => {
                void updateTodo(todo.id, { completed: !todo.completed });
              }}
              onDelete={() => {
                void deleteTodo(todo.id);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
