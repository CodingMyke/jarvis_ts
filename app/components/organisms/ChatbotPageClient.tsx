"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useRef } from "react";
import { VoiceOrb, GearIcon } from "@/app/components";
import { FloatingChat, UpcomingEvents, TimerDisplay, TodoList } from "@/app/components/organisms";
import { useVoiceChat } from "@/app/hooks/useVoiceChat";
import { JARVIS_CONFIG } from "@/app/lib/voice-chat/jarvis.config";
import type { UIDayEvents, UICalendarEvent } from "@/app/lib/calendar/actions";
import { CREATE_CALENDAR_EVENT_TOOL_NAME } from "@/app/lib/voice-chat/tools/definitions/create-calendar-event.tool";
import { UPDATE_CALENDAR_EVENT_TOOL_NAME } from "@/app/lib/voice-chat/tools/definitions/update-calendar-event.tool";
import { DELETE_CALENDAR_EVENT_TOOL_NAME } from "@/app/lib/voice-chat/tools/definitions/delete-calendar-event.tool";
import { useDateTime, useOrbState } from "./ChatbotPageClient.hooks";

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

export function ChatbotPageClient({ initialEvents }: ChatbotPageClientProps) {
  const [events, setEvents] = useState<UIDayEvents[]>(initialEvents);
  const isRefreshingRef = useRef(false);

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

  // Callback per quando viene eseguito un tool del calendario
  const handleToolExecuted = useCallback((toolName: string, result: unknown) => {
    // Tool che modificano il calendario
    const calendarModifyingTools = [
      CREATE_CALENDAR_EVENT_TOOL_NAME,
      UPDATE_CALENDAR_EVENT_TOOL_NAME,
      DELETE_CALENDAR_EVENT_TOOL_NAME,
    ];

    if (calendarModifyingTools.includes(toolName)) {
      // Verifica che l'operazione sia riuscita
      if (result && typeof result === "object" && "success" in result) {
        const successResult = result as { success: boolean };
        if (successResult.success) {
          // Refresh silenzioso dopo un breve delay per permettere all'API di propagare le modifiche
          setTimeout(() => {
            refreshEvents();
          }, 500);
        }
      }
    }
  }, [refreshEvents]);

  const {
    isListening,
    messages,
    startListening,
    stopListening,
    error,
    listeningMode,
    deleteChat,
    outputAudioLevel,
  } = useVoiceChat({ onToolExecuted: handleToolExecuted });

  const orbState = useOrbState(listeningMode);
  const { day, date, time, refs } = useDateTime();

  const handleMicrophoneClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, stopListening, startListening]);

  const status = useMemo(() => {
    const name = JARVIS_CONFIG.assistantName;
    switch (listeningMode) {
      case "wake_word":
        return {
          label: `In attesa... Dì "${name}"`,
          color: "text-yellow-400",
          dotColor: "bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]",
        };
      case "connected":
        return {
          label: `${name} è in ascolto`,
          color: "text-accent",
          dotColor: "bg-accent shadow-[0_0_10px_var(--accent-glow)]",
        };
      default:
        return {
          label: "Tocca l'orb per iniziare",
          color: "text-muted",
          dotColor: "bg-muted",
        };
    }
  }, [listeningMode]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-background p-6">
      {/* Error banner - barra in cima, sempre visibile e mai coperta */}
      {error && (
        <div className="absolute left-0 right-0 top-0 z-20 rounded-b-lg border-b border-red-500/50 bg-red-950/95 px-4 py-3 text-center text-sm text-red-300 shadow-md backdrop-blur-sm">
          {error.message}
        </div>
      )}

      {/* Timer Display - Top Right */}
      <TimerDisplay />

      {/* Todo List - Top Right (below timer if present) */}
      <TodoList />

      {/* Top bar */}
      <div className="flex items-start justify-between">
        {/* Events - Top Left */}
        <UpcomingEvents initialEvents={events} />

        {/* Date/Time - Top Center */}
        <div className="absolute left-1/2 top-6 -translate-x-1/2 flex flex-col items-center">
          <span ref={refs.timeRef} className="text-7xl font-semibold text-foreground">{time}</span>
          <span className="text-3xl text-muted">
            <span ref={refs.dayRef}>{day}</span>, <span ref={refs.dateRef}>{date}</span>
          </span>
        </div>

        {/* Spacer for balance */}
        <div className="w-24" />
      </div>

      {/* Settings - Bottom Left */}
      <Link
        href="/settings"
        className="absolute bottom-6 left-6 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted transition-colors hover:bg-white/10 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20"
        aria-label="Impostazioni"
      >
        <GearIcon className="h-5 w-5" />
      </Link>

      {/* Status indicator - Bottom Center */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full ${status.dotColor} ${listeningMode !== "idle" ? "animate-pulse" : ""}`} />
          <span className={`text-sm ${status.color}`}>{status.label}</span>
        </div>
      </div>

      {/* Main content - Orb centered */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible">
        {/* Orb - interactive */}
        <VoiceOrb
          state={orbState}
          audioLevel={outputAudioLevel}
          onClick={handleMicrophoneClick}
        />
      </div>

      {/* Floating chat */}
      <FloatingChat messages={messages} onDeleteChat={deleteChat} />
    </div>
  );
}
