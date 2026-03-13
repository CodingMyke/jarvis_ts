"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Todo } from "@/app/_features/tasks/types";

interface TodoContextValue {
  todos: Todo[];
  invalidateTodos: () => Promise<void>;
  createTodo: (text: string) => void;
  updateTodo: (id: string, updates: Partial<Pick<Todo, "text" | "completed">>) => void;
  deleteTodo: (id: string) => void;
  deleteCompletedTodos: () => void;
}

const TodoContext = createContext<TodoContextValue | undefined>(undefined);

function toTodo(t: {
  id: string;
  text: string;
  completed: boolean;
  createdAt?: number;
  updatedAt?: number;
}): Todo {
  return {
    id: t.id,
    text: t.text,
    completed: t.completed,
    createdAt: t.createdAt ?? 0,
    updatedAt: t.updatedAt ?? 0,
  };
}

interface TodoProviderProps {
  children: React.ReactNode;
  initialTodos?: Todo[];
}

export function TodoProvider({ children, initialTodos }: TodoProviderProps) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos ?? []);

  const invalidateTodos = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success && Array.isArray(data.todos)) {
        setTodos(data.todos.map(toTodo));
      } else {
        setTodos([]);
      }
    } catch {
      setTodos([]);
    }
  }, []);

  useEffect(() => {
    if (initialTodos === undefined) {
      queueMicrotask(() => void invalidateTodos());
    }
  }, [initialTodos, invalidateTodos]);

  const createTodo = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed }),
        });
        const data = await res.json();
        if (data.success) await invalidateTodos();
      } catch {
        // Mantieni stato attuale.
      }
    },
    [invalidateTodos],
  );

  const updateTodo = useCallback(
    async (id: string, updates: Partial<Pick<Todo, "text" | "completed">>) => {
      if (Object.keys(updates).length === 0) return;
      try {
        const body: { id: string; text?: string; completed?: boolean } = { id };
        if (updates.text !== undefined) body.text = updates.text;
        if (updates.completed !== undefined) body.completed = updates.completed;
        const res = await fetch("/api/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.success) await invalidateTodos();
      } catch {
        // Mantieni stato attuale.
      }
    },
    [invalidateTodos],
  );

  const deleteTodo = useCallback(
    async (id: string) => {
      try {
        const res = await fetch("/api/tasks", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const data = await res.json();
        if (data.success) await invalidateTodos();
      } catch {
        // Mantieni stato attuale.
      }
    },
    [invalidateTodos],
  );

  const deleteCompletedTodos = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteCompleted: true }),
      });
      const data = await res.json();
      if (data.success) await invalidateTodos();
    } catch {
      // Mantieni stato attuale.
    }
  }, [invalidateTodos]);

  return (
    <TodoContext.Provider
      value={{
        todos,
        invalidateTodos,
        createTodo,
        updateTodo,
        deleteTodo,
        deleteCompletedTodos,
      }}
    >
      {children}
    </TodoContext.Provider>
  );
}

export function useTodos(): TodoContextValue {
  const context = useContext(TodoContext);
  if (context === undefined) {
    throw new Error("useTodos must be used within a TodoProvider");
  }
  return context;
}
