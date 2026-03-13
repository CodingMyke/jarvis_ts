"use client";

import { useCallback, useState, useRef } from "react";
import { useVoiceChat } from "@/app/_features/assistant/hooks/useVoiceChat";
import { JARVIS_CONFIG } from "@/app/_features/assistant/lib/jarvis.config";
import { CREATE_TODO_TOOL_NAME } from "@/app/_features/assistant/tools/definitions/create-todo.tool";
import {
  removeCalendarEventFromDays,
  type DeleteCalendarEventHandler,
  type DeleteCalendarEventUiResult,
  type UIDayEvents,
  type UICalendarEvent,
} from "@/app/_features/calendar";
import { CREATE_CALENDAR_EVENT_TOOL_NAME } from "@/app/_features/assistant/tools/definitions/create-calendar-event.tool";
import { DELETE_TODO_TOOL_NAME } from "@/app/_features/assistant/tools/definitions/delete-todo.tool";
import { UPDATE_CALENDAR_EVENT_TOOL_NAME } from "@/app/_features/assistant/tools/definitions/update-calendar-event.tool";
import { DELETE_CALENDAR_EVENT_TOOL_NAME } from "@/app/_features/assistant/tools/definitions/delete-calendar-event.tool";
import { UPDATE_TODO_TOOL_NAME } from "@/app/_features/assistant/tools/definitions/update-todo.tool";
import { useTodos } from "@/app/_features/tasks";
import { useDateTime, useOrbState } from "./ChatbotPageClient.hooks";
import { AssistantShell } from "./AssistantShell";

interface ChatbotPageClientProps {
  initialEvents: UIDayEvents[];
}

/**
 * Formatta l'orario da una Date.
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Converte un evento dal formato API al formato UI.
 */
function toUIEvent(event: {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  color?: string;
  description?: string;
  location?: string;
  attendees?: string[];
}): UICalendarEvent {
  return {
    id: event.id,
    title: event.title,
    time: formatTime(new Date(event.startTime)),
    endTime: event.endTime ? formatTime(new Date(event.endTime)) : undefined,
    color: event.color,
    description: event.description,
    location: event.location,
    attendees: event.attendees,
  };
}

/**
 * Raggruppa gli eventi per giorno.
 */
function groupEventsByDay(events: Array<{
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  color?: string;
  description?: string;
  location?: string;
  attendees?: string[];
}>): UIDayEvents[] {
  const grouped = new Map<string, UICalendarEvent[]>();

  for (const event of events) {
    const dateKey = new Date(event.startTime).toISOString().split("T")[0];
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(toUIEvent(event));
  }

  // Ordina per data e restituisci
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateISO, events]) => ({ dateISO, events }));
}

/**
 * Chiama l'API route per ottenere gli eventi del calendario.
 */
async function fetchCalendarEventsFromAPI(options?: {
  from?: Date;
  to?: Date;
  daysAhead?: number;
}): Promise<UIDayEvents[]> {
  try {
    const params = new URLSearchParams();
    
    if (options?.daysAhead) {
      params.append("daysAhead", options.daysAhead.toString());
    } else if (options?.from && options?.to) {
      params.append("from", options.from.toISOString());
      params.append("to", options.to.toISOString());
    } else {
      params.append("daysAhead", "7");
    }

    const response = await fetch(`/api/calendar/events?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      console.error("[fetchCalendarEventsFromAPI] Errore:", data.message || data.error);
      return [];
    }

    return groupEventsByDay(data.events || []);
  } catch (error) {
    console.error("[fetchCalendarEventsFromAPI] Errore:", error);
    return [];
  }
}

async function deleteCalendarEventFromAPI(
  eventId: string
): Promise<DeleteCalendarEventUiResult> {
  const trimmedEventId = eventId.trim();

  if (trimmedEventId.length === 0) {
    return {
      success: false,
      errorMessage: "ID evento non valido.",
    };
  }

  try {
    const response = await fetch(
      `/api/calendar/events?eventId=${encodeURIComponent(trimmedEventId)}`,
      {
        method: "DELETE",
      }
    );
    const data = (await response.json().catch(() => null)) as
      | { success?: boolean; errorMessage?: string; message?: string; error?: string }
      | null;

    if (!response.ok || !data?.success) {
      return {
        success: false,
        errorMessage:
          data?.errorMessage
          ?? data?.message
          ?? data?.error
          ?? `Errore HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      errorMessage:
        error instanceof Error
          ? error.message
          : "Errore sconosciuto durante l'eliminazione dell'evento.",
    };
  }
}

export function ChatbotPageClient({ initialEvents }: ChatbotPageClientProps) {
  const [events, setEvents] = useState<UIDayEvents[]>(initialEvents);
  const isRefreshingRef = useRef(false);
  const { invalidateTodos } = useTodos();

  // Funzione per refreshare gli eventi senza loader
  const refreshEvents = useCallback(async () => {
    // Evita refresh multipli simultanei
    if (isRefreshingRef.current) return;
    
    isRefreshingRef.current = true;
    try {
      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const updatedEvents = await fetchCalendarEventsFromAPI({
        from: now,
        to: sevenDaysLater,
      });
      // Assicurati di creare sempre un nuovo array per forzare il re-render
      setEvents([...updatedEvents]);
    } catch (error) {
      console.error("[ChatbotPageClient] Errore durante il refresh degli eventi:", error);
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  const handleDeleteEvent = useCallback<DeleteCalendarEventHandler>(async (eventId) => {
    const result = await deleteCalendarEventFromAPI(eventId);

    if (!result.success) {
      return result;
    }

    setEvents((current) => removeCalendarEventFromDays(current, eventId));

    setTimeout(() => {
      void refreshEvents();
    }, 500);

    return { success: true };
  }, [refreshEvents]);

  // Callback per quando viene eseguito un tool che impatta calendar/tasks.
  const handleToolExecuted = useCallback((toolName: string, result: unknown) => {
    const isSuccessfulResult =
      result !== null
      && typeof result === "object"
      && "success" in result
      && (result as { success: boolean }).success;
    if (!isSuccessfulResult) {
      return;
    }

    const calendarModifyingTools = [
      CREATE_CALENDAR_EVENT_TOOL_NAME,
      UPDATE_CALENDAR_EVENT_TOOL_NAME,
      DELETE_CALENDAR_EVENT_TOOL_NAME,
    ];

    if (calendarModifyingTools.includes(toolName)) {
      // Refresh silenzioso dopo un breve delay per permettere all'API di propagare le modifiche.
      setTimeout(() => {
        void refreshEvents();
      }, 500);
    }

    const taskModifyingTools = [
      CREATE_TODO_TOOL_NAME,
      UPDATE_TODO_TOOL_NAME,
      DELETE_TODO_TOOL_NAME,
    ];

    if (taskModifyingTools.includes(toolName)) {
      setTimeout(() => {
        void invalidateTodos();
      }, 300);
    }
  }, [invalidateTodos, refreshEvents]);

  const {
    isListening,
    messages,
    startListening,
    stopListening,
    error,
    listeningMode,
    deleteChat,
    outputAudioLevel,
    chatTitle,
  } = useVoiceChat({ onToolExecuted: handleToolExecuted });

  const orbState = useOrbState(listeningMode);
  const { day, date, time, timeRef, dayRef, dateRef } = useDateTime();

  const handleMicrophoneClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, stopListening, startListening]);

  return (
    <AssistantShell
      errorMessage={error?.message}
      listeningMode={listeningMode}
      assistantName={JARVIS_CONFIG.assistantName}
      day={day}
      date={date}
      time={time}
      timeRef={timeRef}
      dayRef={dayRef}
      dateRef={dateRef}
      events={events}
      orbState={orbState}
      outputAudioLevel={outputAudioLevel}
      onMicrophoneClick={handleMicrophoneClick}
      messages={messages}
      chatTitle={chatTitle}
      onDeleteChat={deleteChat}
      onDeleteEvent={handleDeleteEvent}
    />
  );
}
