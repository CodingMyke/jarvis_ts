"use client";

import { TodoItem } from "@/app/design/molecules/tasks/TodoItem";
import { useTasksStore } from "@/app/_features/tasks";

export function DashboardTodoPanel() {
  const todos = useTasksStore((state) => state.todos);
  const updateTodo = useTasksStore((state) => state.update);
  const deleteTodo = useTasksStore((state) => state.remove);

  if (todos.length === 0) {
    return null;
  }

  const pendingTodos = todos.filter((todo) => !todo.completed);
  const completedTodos = todos.filter((todo) => todo.completed);

  return (
    <div className="glass-scroll max-h-[calc(100vh-260px)] overflow-y-auto">
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
  );
}
