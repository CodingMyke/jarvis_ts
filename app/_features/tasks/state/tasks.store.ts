"use client";

import { create } from "zustand";
import type { Todo } from "@/app/_features/tasks/types";
import {
  createTodos,
  deleteTodos,
  getTodos,
  updateTodos,
} from "@/app/_features/tasks/lib/tasks-client";

export type TasksStoreStatus = "idle" | "loading" | "ready" | "error";

interface TasksStoreState {
  todos: Todo[];
  status: TasksStoreStatus;
  error: string | null;
  initialized: boolean;
  initialize: (todos: Todo[]) => void;
  refresh: () => Promise<Todo[]>;
  create: (text: string) => Promise<boolean>;
  update: (id: string, updates: Partial<Pick<Todo, "text" | "completed">>) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  clearCompleted: () => Promise<boolean>;
}

function setReadyState(todos: Todo[]): Pick<TasksStoreState, "todos" | "status" | "error" | "initialized"> {
  return {
    todos,
    status: "ready",
    error: null,
    initialized: true,
  };
}

export const useTasksStore = create<TasksStoreState>((set, get) => ({
  todos: [],
  status: "idle",
  error: null,
  initialized: false,
  initialize: (todos) => {
    set(setReadyState(todos));
  },
  refresh: async () => {
    set((state) => ({
      ...state,
      status: "loading",
      error: null,
    }));

    const result = await getTodos();

    if (result.success) {
      set(setReadyState(result.todos));
      return result.todos;
    }

    set((state) => ({
      ...state,
      status: "error",
      error: result.errorMessage,
      initialized: true,
    }));
    return get().todos;
  },
  create: async (text) => {
    const result = await createTodos({ text });

    if (!result.success) {
      set((state) => ({
        ...state,
        status: "error",
        error: result.errorMessage,
      }));
      return false;
    }

    await get().refresh();
    return true;
  },
  update: async (id, updates) => {
    const result = await updateTodos({
      id,
      text: updates.text,
      completed: updates.completed,
    });

    if (!result.success) {
      set((state) => ({
        ...state,
        status: "error",
        error: result.errorMessage,
      }));
      return false;
    }

    await get().refresh();
    return true;
  },
  remove: async (id) => {
    const result = await deleteTodos({ id });

    if (!result.success) {
      set((state) => ({
        ...state,
        status: "error",
        error: result.errorMessage,
      }));
      return false;
    }

    await get().refresh();
    return true;
  },
  clearCompleted: async () => {
    const result = await deleteTodos({ deleteCompleted: true });

    if (!result.success) {
      set((state) => ({
        ...state,
        status: "error",
        error: result.errorMessage,
      }));
      return false;
    }

    await get().refresh();
    return true;
  },
}));

export function initializeTasksStore(todos: Todo[]): void {
  useTasksStore.getState().initialize(todos);
}
