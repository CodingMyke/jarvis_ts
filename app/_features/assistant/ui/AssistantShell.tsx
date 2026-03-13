import type { RefObject } from "react";
import type { Message } from "@/app/_features/assistant/types/speech.types";
import type { AssistantSessionState } from "@/app/_features/assistant/lib";
import type { DeleteCalendarEventHandler, UIDayEvents } from "@/app/_features/calendar";
import { FloatingChat } from "./FloatingChat";
import { VoiceOrb } from "./VoiceOrb";
import { AssistantActions } from "./AssistantActions";
import { AssistantClock } from "./AssistantClock";
import { AssistantPanels } from "./AssistantPanels";
import { AssistantStatus } from "./AssistantStatus";

interface AssistantShellProps {
  errorMessage?: string;
  listeningMode: AssistantSessionState;
  assistantName: string;
  day: string;
  date: string;
  time: string;
  timeRef: RefObject<HTMLSpanElement | null>;
  dayRef: RefObject<HTMLSpanElement | null>;
  dateRef: RefObject<HTMLSpanElement | null>;
  events: UIDayEvents[];
  orbState: "idle" | "listening" | "speaking";
  outputAudioLevel: number;
  onMicrophoneClick: () => void;
  messages: Message[];
  chatTitle?: string | null;
  onDeleteChat: () => void;
  onDeleteEvent: DeleteCalendarEventHandler;
}

export function AssistantShell({
  errorMessage,
  listeningMode,
  assistantName,
  day,
  date,
  time,
  timeRef,
  dayRef,
  dateRef,
  events,
  orbState,
  outputAudioLevel,
  onMicrophoneClick,
  messages,
  chatTitle,
  onDeleteChat,
  onDeleteEvent,
}: AssistantShellProps) {
  return (
    <div className="fixed inset-0 overflow-hidden bg-background p-6">
      {errorMessage && (
        <div className="absolute left-0 right-0 top-0 z-20 rounded-b-lg border-b border-red-500/50 bg-red-950/95 px-4 py-3 text-center text-sm text-red-300 shadow-md backdrop-blur-sm">
          {errorMessage}
        </div>
      )}

      <AssistantPanels events={events} onDeleteEvent={onDeleteEvent} />
      <AssistantClock
        day={day}
        date={date}
        time={time}
        timeRef={timeRef}
        dayRef={dayRef}
        dateRef={dateRef}
      />
      <AssistantActions />
      <AssistantStatus listeningMode={listeningMode} assistantName={assistantName} />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible">
        <VoiceOrb
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
