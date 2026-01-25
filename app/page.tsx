"use client";

import { useState } from "react";
import { VoiceOrb, Button } from "@/app/components";
import { MessageList } from "@/app/components/organisms";
import { useVoiceChat } from "@/app/hooks/useVoiceChat";

function useOrbState(listeningMode: string) {
  switch (listeningMode) {
    case "connected":
      return "speaking" as const;
    case "wake_word":
      return "listening" as const;
    default:
      return "idle" as const;
  }
}

export default function ChatbotPage() {
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

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const orbState = useOrbState(listeningMode);

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
    <div className="fixed inset-0 overflow-hidden bg-background">
      {/* Main content - Orb centered */}
      <div className="flex h-full w-full flex-col items-center justify-center">
        {/* Status indicator - top */}
        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className={`h-2 w-2 rounded-full ${status.dotColor} ${listeningMode !== "idle" ? "animate-pulse" : ""}`} />
            <span className={`text-sm ${status.color}`}>{status.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <>
                <Button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  variant="secondary"
                  className="glass rounded-lg px-3 py-1.5 text-sm"
                >
                  {isSidebarOpen ? "Chiudi" : "Chat"}
                  {!isSidebarOpen && messages.length > 0 && (
                    <span className="ml-2 rounded-full bg-accent/20 px-1.5 py-0.5 text-xs text-accent">
                      {messages.length}
                    </span>
                  )}
                </Button>
                <Button
                  onClick={clearConversation}
                  variant="secondary"
                  className="glass rounded-lg px-3 py-1.5 text-sm"
                >
                  Reset
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="absolute left-4 right-4 top-16 z-10 glass rounded-lg px-4 py-2 text-center text-sm text-red-400">
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

      {/* Messages sidebar - collapsible */}
      <aside
        className={`glass glass-scroll fixed bottom-20 top-16 z-20 w-80 overflow-y-auto rounded-2xl transition-all duration-300 ease-out ${
          isSidebarOpen
            ? "right-4 opacity-100"
            : "pointer-events-none -right-80 opacity-0"
        }`}
      >
        <MessageList messages={messages} />
      </aside>
    </div>
  );
}
