"use client";

import { useCallback, type RefObject } from "react";
import { JARVIS_CONFIG } from "@/app/_features/assistant/lib/jarvis.config";
import {
  isCalendarMutationTool,
  isSuccessfulToolResult,
  isTaskMutationTool,
} from "@/app/_features/assistant/lib/tool-effects";
import { useVoiceChat } from "@/app/_features/assistant/hooks/useVoiceChat";
import type { DeleteCalendarEventHandler, UIDayEvents } from "@/app/_features/calendar";
import { deleteCalendarEventFromApi } from "@/app/_features/calendar/lib/calendar-client";
import { useCalendarStore } from "@/app/_features/calendar/state/calendar.store";
import { useTasksStore } from "@/app/_features/tasks/state/tasks.store";
import type { Todo } from "@/app/_features/tasks/types";
import { useAssistantDateTime } from "./useAssistantDateTime";
import { useAssistantDomainBootstrap } from "./useAssistantDomainBootstrap";
import { useAssistantOrbState } from "./useAssistantOrbState";

interface UseAssistantWorkspaceOptions {
  initialEvents: UIDayEvents[];
  initialTodos: Todo[];
}

interface UseAssistantWorkspaceResult {
  assistantName: string;
  chatTitle: string | null;
  date: string;
  dateRef: RefObject<HTMLSpanElement | null>;
  day: string;
  dayRef: RefObject<HTMLSpanElement | null>;
  errorMessage?: string;
  listeningMode: ReturnType<typeof useVoiceChat>["listeningMode"];
  messages: ReturnType<typeof useVoiceChat>["messages"];
  onDeleteChat: () => void;
  onDeleteEvent: DeleteCalendarEventHandler;
  onMicrophoneClick: () => void;
  orbState: "idle" | "listening" | "speaking";
  outputAudioLevel: number;
  time: string;
  timeRef: RefObject<HTMLSpanElement | null>;
}

export function useAssistantWorkspace({
  initialEvents,
  initialTodos,
}: UseAssistantWorkspaceOptions): UseAssistantWorkspaceResult {
  useAssistantDomainBootstrap({ initialEvents, initialTodos });

  const refreshCalendar = useCalendarStore((state) => state.refresh);
  const applyCalendarMutationResult = useCalendarStore(
    (state) => state.applyEventMutationResult,
  );
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

  const {
    error,
    listeningMode,
    messages,
    startListening,
    stopListening,
    deleteChat,
    outputAudioLevel,
    chatTitle,
  } = useVoiceChat({ onToolExecuted: handleToolExecuted });

  const orbState = useAssistantOrbState(listeningMode);
  const { date, dateRef, day, dayRef, time, timeRef } = useAssistantDateTime();

  const onDeleteEvent = useCallback<DeleteCalendarEventHandler>(
    async (eventId) => {
      const result = await deleteCalendarEventFromApi(eventId);

      if (!result.success) {
        return result;
      }

      applyCalendarMutationResult({ removedEventId: eventId });

      setTimeout(() => {
        void refreshCalendar();
      }, 500);

      return { success: true };
    },
    [applyCalendarMutationResult, refreshCalendar],
  );

  return {
    assistantName: JARVIS_CONFIG.assistantName,
    chatTitle,
    date,
    dateRef,
    day,
    dayRef,
    errorMessage: error?.message,
    listeningMode,
    messages,
    onDeleteChat: deleteChat,
    onDeleteEvent,
    onMicrophoneClick: () => {
      if (listeningMode === "idle") {
        startListening();
        return;
      }

      stopListening();
    },
    orbState,
    outputAudioLevel,
    time,
    timeRef,
  };
}
