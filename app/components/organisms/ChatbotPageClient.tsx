"use client";

import { VoiceOrb } from "@/app/components";
import { FloatingChat, UpcomingEvents } from "@/app/components/organisms";
import { useVoiceChat } from "@/app/hooks/useVoiceChat";
import type { UIDayEvents } from "@/app/lib/calendar/actions";
import { useDateTime, useOrbState } from "./ChatbotPageClient.hooks";

interface ChatbotPageClientProps {
  initialEvents: UIDayEvents[];
}

export function ChatbotPageClient({ initialEvents }: ChatbotPageClientProps) {
  const {
    isListening,
    messages,
    startListening,
    stopListening,
    error,
    listeningMode,
    clearConversation,
    outputAudioLevel,
  } = useVoiceChat();

  const orbState = useOrbState(listeningMode);
  const { day, date, time } = useDateTime();

  const handleMicrophoneClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const getStatusConfig = () => {
    switch (listeningMode) {
      case "wake_word":
        return {
          label: 'In ascolto... Dì "Jarvis"',
          color: "text-yellow-400",
          dotColor: "bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]",
        };
      case "connected":
        return {
          label: "Connesso con Jarvis",
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
  };

  const status = getStatusConfig();

  return (
    <div className="fixed inset-0 overflow-hidden bg-background p-6">
      {/* Top bar */}
      <div className="flex items-start justify-between">
        {/* Events - Top Left */}
        <UpcomingEvents initialEvents={initialEvents} />

        {/* Date/Time - Top Center */}
        <div className="absolute left-1/2 top-6 -translate-x-1/2 flex flex-col items-center">
          <span className="text-7xl font-semibold text-foreground">{time}</span>
          <span className="text-3xl text-muted">{day}, {date}</span>
        </div>

        {/* Spacer for balance */}
        <div className="w-24" />
      </div>

      {/* Status indicator - Bottom Center */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full ${status.dotColor} ${listeningMode !== "idle" ? "animate-pulse" : ""}`} />
          <span className={`text-sm ${status.color}`}>{status.label}</span>
        </div>
      </div>

      {/* Main content - Orb centered */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {/* Error display */}
        {error && (
          <div className="absolute left-0 right-0 top-12 z-10 glass rounded-lg px-4 py-2 text-center text-sm text-red-400">
            {error.message}
          </div>
        )}

        {/* Orb - interactive */}
        <VoiceOrb
          state={orbState}
          audioLevel={outputAudioLevel}
          onClick={handleMicrophoneClick}
        />
      </div>

      {/* Floating chat */}
      <FloatingChat messages={messages} onReset={clearConversation} />
    </div>
  );
}
