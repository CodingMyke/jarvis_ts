"use client";

import { create } from "zustand";
import type { Todo } from "@/app/_features/tasks/types";
import {
  clearCompletedTasksFromApi,
  createTaskFromApi,
  deleteTaskFromApi,
  fetchTasksFromApi,
  updateTaskFromApi,
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

    try {
      const todos = await fetchTasksFromApi();
      set(setReadyState(todos));
      return todos;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Errore sconosciuto durante il refresh dei task.";
      set((state) => ({
        ...state,
        status: "error",
        error: message,
        initialized: true,
      }));
      return get().todos;
    }
  },
  create: async (text) => {
    try {
      await createTaskFromApi(text);
      await get().refresh();
      return true;
    } catch (error) {
      set((state) => ({
        ...state,
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Errore sconosciuto durante la creazione del task.",
      }));
      return false;
    }
  },
  update: async (id, updates) => {
    try {
      await updateTaskFromApi(id, updates);
      await get().refresh();
      return true;
    } catch (error) {
      set((state) => ({
        ...state,
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Errore sconosciuto durante l'aggiornamento del task.",
      }));
      return false;
    }
  },
  remove: async (id) => {
    try {
      await deleteTaskFromApi(id);
      await get().refresh();
      return true;
    } catch (error) {
      set((state) => ({
        ...state,
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Errore sconosciuto durante l'eliminazione del task.",
      }));
      return false;
    }
  },
  clearCompleted: async () => {
    try {
      await clearCompletedTasksFromApi();
      await get().refresh();
      return true;
    } catch (error) {
      set((state) => ({
        ...state,
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Errore sconosciuto durante la pulizia dei task completati.",
      }));
      return false;
    }
  },
}));

export function initializeTasksStore(todos: Todo[]): void {
  useTasksStore.getState().initialize(todos);
}
