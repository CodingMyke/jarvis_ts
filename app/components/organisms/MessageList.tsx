"use client";

import { useRef, useEffect, RefObject } from "react";
import { ChatBubble } from "@/app/components/molecules";
import { Message } from "@/app/lib/speech";

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

export function MessageList({
  messages,
  welcomeMessage = "Ciao! Sono Jarvis, il tuo assistente AI vocale. Premi il pulsante del microfono per iniziare a conversare!",
}: MessageListProps) {
  const endRef = useAutoScroll(messages);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-4">
        {messages.length === 0 && (
          <ChatBubble
            message={{ id: "welcome", text: welcomeMessage, isUser: false }}
          />
        )}
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
