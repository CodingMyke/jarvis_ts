"use client";

import { createContext, useCallback, useMemo, type ReactNode } from "react";
import { useVoiceChat } from "@/app/_features/assistant/hooks/useVoiceChat";
import type { AssistantSessionState } from "@/app/_features/assistant/lib";
import {
  isCalendarMutationTool,
  isSuccessfulToolResult,
  isTaskMutationTool,
} from "@/app/_features/assistant/lib/tool-effects";
import { useCalendarStore } from "@/app/_features/calendar/state/calendar.store";
import { useTasksStore } from "@/app/_features/tasks/state/tasks.store";

export interface AppShellAssistantContextValue {
  listeningMode: AssistantSessionState;
  logoBorderClassName: string;
  onLogoToggle: () => void;
}

export const AppShellAssistantContext = createContext<AppShellAssistantContextValue | null>(null);

function getLogoBorderClassName(listeningMode: AssistantSessionState): string {
  if (listeningMode === "wake_word") {
    return "border-amber-400/80";
  }

  if (listeningMode === "connected") {
    return "border-cyan-400/80";
  }

  return "border-white/10";
}

export function AppShellAssistantProvider({ children }: { children: ReactNode }) {
  const refreshCalendar = useCalendarStore((state) => state.refresh);
  const refreshTasks = useTasksStore((state) => state.refresh);

  const handleToolExecuted = useCallback(
    (toolName: string, result: unknown) => {
      if (!isSuccessfulToolResult(result)) {
        return;
      }

      if (isCalendarMutationTool(toolName)) {
        setTimeout(() => {
          void refreshCalendar();
        }, 500);
      }

      if (isTaskMutationTool(toolName)) {
        setTimeout(() => {
          void refreshTasks();
        }, 300);
      }
    },
    [refreshCalendar, refreshTasks],
  );

  const { listeningMode, startListening, stopListening } = useVoiceChat({
    onToolExecuted: handleToolExecuted,
  });

  const onLogoToggle = useCallback(() => {
    if (listeningMode === "idle") {
      startListening();
      return;
    }

    stopListening();
  }, [listeningMode, startListening, stopListening]);

  const value = useMemo<AppShellAssistantContextValue>(
    () => ({
      listeningMode,
      logoBorderClassName: getLogoBorderClassName(listeningMode),
      onLogoToggle,
    }),
    [listeningMode, onLogoToggle],
  );

  return (
    <AppShellAssistantContext.Provider value={value}>
      {children}
    </AppShellAssistantContext.Provider>
  );
}
