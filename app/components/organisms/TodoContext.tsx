"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Todo } from "@/app/lib/todo";
import { TODOS_CHANGED_EVENT } from "@/app/lib/tasks";

interface TodoContextValue {
  todos: Todo[];
  createTodo: (text: string) => void;
  updateTodo: (id: string, updates: Partial<Pick<Todo, "text" | "completed">>) => void;
  deleteTodo: (id: string) => void;
  deleteCompletedTodos: () => void;
}

const TodoContext = createContext<TodoContextValue | undefined>(undefined);

function toTodo(t: { id: string; text: string; completed: boolean; createdAt?: number; updatedAt?: number }): Todo {
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
  /** Task caricati lato server (prima volta); se presenti si evita il fetch al mount. */
  initialTodos?: Todo[];
}

export function TodoProvider({ children, initialTodos }: TodoProviderProps) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos ?? []);

  const loadTasks = useCallback(async () => {
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
      queueMicrotask(() => void loadTasks());
    }
  }, [loadTasks, initialTodos]);

  // Aggiorna la lista quando l'assistente modifica i task (create/update/delete via tool)
  useEffect(() => {
    const onTodosChanged = () => void loadTasks();
    window.addEventListener(TODOS_CHANGED_EVENT, onTodosChanged);
    return () => window.removeEventListener(TODOS_CHANGED_EVENT, onTodosChanged);
  }, [loadTasks]);

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
        if (data.success) await loadTasks();
      } catch {
        // mantieni stato attuale
      }
    },
    [loadTasks]
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
        if (data.success) await loadTasks();
      } catch {
        // mantieni stato attuale
      }
    },
    [loadTasks]
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
        if (data.success) await loadTasks();
      } catch {
        // mantieni stato attuale
      }
    },
    [loadTasks]
  );

  const deleteCompletedTodos = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteCompleted: true }),
      });
      const data = await res.json();
      if (data.success) await loadTasks();
    } catch {
      // mantieni stato attuale
    }
  }, [loadTasks]);

  return (
    <TodoContext.Provider value={{ todos, createTodo, updateTodo, deleteTodo, deleteCompletedTodos }}>
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
