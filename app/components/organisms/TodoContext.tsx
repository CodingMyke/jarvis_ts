"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { todoManager, type Todo } from "@/app/lib/todo";

interface TodoContextValue {
  todos: Todo[];
  createTodo: (text: string) => Todo;
  updateTodo: (id: string, updates: Partial<Pick<Todo, "text" | "completed">>) => Todo | null;
  deleteTodo: (id: string) => boolean;
  deleteCompletedTodos: () => number;
}

const TodoContext = createContext<TodoContextValue | undefined>(undefined);

export function TodoProvider({ children }: { children: React.ReactNode }) {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    const unsubscribe = todoManager.subscribe((updatedTodos) => {
      setTodos(updatedTodos);
    });

    return unsubscribe;
  }, []);

  const createTodo = useCallback((text: string) => {
    return todoManager.createTodo(text);
  }, []);

  const updateTodo = useCallback((id: string, updates: Partial<Pick<Todo, "text" | "completed">>) => {
    return todoManager.updateTodo(id, updates);
  }, []);

  const deleteTodo = useCallback((id: string) => {
    return todoManager.deleteTodo(id);
  }, []);

  const deleteCompletedTodos = useCallback(() => {
    return todoManager.deleteCompletedTodos();
  }, []);

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
