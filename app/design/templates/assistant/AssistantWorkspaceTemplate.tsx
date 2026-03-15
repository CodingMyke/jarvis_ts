"use client";

import { AssistantActionsLink } from "@/app/design/organisms/assistant/AssistantActionsLink";
import { AssistantClock } from "@/app/design/organisms/assistant/AssistantClock";
import { AssistantStatusPanel } from "@/app/design/organisms/assistant/AssistantStatusPanel";
import { FloatingChat } from "@/app/design/organisms/assistant/FloatingChat";
import { VoiceOrbPanel } from "@/app/design/organisms/assistant/VoiceOrbPanel";
import { CalendarPanel } from "@/app/design/organisms/calendar/CalendarPanel";
import { TodoPanel } from "@/app/design/organisms/tasks/TodoPanel";
import { TimerPanel } from "@/app/design/organisms/timer/TimerPanel";
import type { UIDayEvents } from "@/app/_features/calendar";
import type { Todo } from "@/app/_features/tasks/types";
import { useAssistantWorkspace } from "./useAssistantWorkspace";

export interface ChatbotPageClientProps {
  initialEvents: UIDayEvents[];
  initialTodos: Todo[];
}

export function AssistantWorkspaceTemplate({
  initialEvents,
  initialTodos,
}: ChatbotPageClientProps) {
  const {
    assistantName,
    chatTitle,
    date,
    dateRef,
    day,
    dayRef,
    errorMessage,
    listeningMode,
    messages,
    onDeleteChat,
    onDeleteEvent,
    onMicrophoneClick,
    orbState,
    outputAudioLevel,
    time,
    timeRef,
  } = useAssistantWorkspace({
    initialEvents,
    initialTodos,
  });

  return (
    <div className="fixed inset-0 overflow-hidden bg-background p-6">
      {!!errorMessage && (
        <div className="absolute left-0 right-0 top-0 z-20 rounded-b-lg border-b border-red-500/50 bg-red-950/95 px-4 py-3 text-center text-sm text-red-300 shadow-md backdrop-blur-sm">
          {errorMessage}
        </div>
      )}

      <TimerPanel />
      <TodoPanel />

      <div className="flex items-start justify-between">
        <CalendarPanel onDeleteEvent={onDeleteEvent} />
        <div className="w-24" />
      </div>

      <AssistantClock
        day={day}
        date={date}
        time={time}
        timeRef={timeRef}
        dayRef={dayRef}
        dateRef={dateRef}
      />
      <AssistantActionsLink />
      <AssistantStatusPanel
        listeningMode={listeningMode}
        assistantName={assistantName}
      />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible">
        <VoiceOrbPanel
          state={orbState}
          audioLevel={outputAudioLevel}
          onClick={onMicrophoneClick}
        />
      </div>

      <FloatingChat
        messages={messages}
        title={chatTitle ?? undefined}
        onDeleteChat={onDeleteChat}
      />
    </div>
  );
}
