"use client";

import { useRef, useEffect, RefObject } from "react";
import { ChatBubble } from "@/app/components/molecules";
import { Message } from "@/app/lib/speech";
import { JARVIS_CONFIG } from "@/app/lib/voice-chat/jarvis.config";

interface MessageListProps {
  messages: Message[];
  welcomeMessage?: string;
}

function useAutoScroll(messages: Message[]): RefObject<HTMLDivElement | null> {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return endRef;
}

const defaultWelcomeMessage = `Dì "${JARVIS_CONFIG.assistantName}" per iniziare una conversazione.`;

export function MessageList({
  messages,
  welcomeMessage = defaultWelcomeMessage,
}: MessageListProps) {
  const endRef = useAutoScroll(messages);

  return (
    <div className="flex h-full flex-col p-4">
      <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted">
        Conversazione
      </h2>
      <div className="flex-1 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted">{welcomeMessage}</p>
        )}
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
