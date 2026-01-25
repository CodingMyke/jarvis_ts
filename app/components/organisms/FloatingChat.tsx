"use client";

import { useRef, useEffect, useState, RefObject } from "react";
import { ChatBubble } from "@/app/components/molecules";
import { Message } from "@/app/lib/speech";
import { ChevronUpIcon, ChevronDownIcon } from "@/app/components/atoms/icons";

interface FloatingChatProps {
  messages: Message[];
}

function useAutoScroll(messages: Message[]): RefObject<HTMLDivElement | null> {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return endRef;
}

function useFloatingChat() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const toggleExpanded = () => setIsExpanded((prev) => !prev);
  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  const showControls = isHovered || isExpanded;

  return {
    isExpanded,
    isHovered,
    showControls,
    toggleExpanded,
    handleMouseEnter,
    handleMouseLeave,
  };
}

export function FloatingChat({ messages }: FloatingChatProps) {
  const endRef = useAutoScroll(messages);
  const {
    isExpanded,
    showControls,
    toggleExpanded,
    handleMouseEnter,
    handleMouseLeave,
  } = useFloatingChat();

  if (messages.length === 0) return null;

  return (
    <div
      className={`floating-chat fixed right-4 z-20 w-[28rem] transition-[top,bottom,height] duration-500 ease-out ${
        isExpanded
          ? "bottom-4 top-4"
          : "bottom-4 h-64"
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
        <div
          className={`relative flex h-full flex-col overflow-hidden rounded-2xl border transition-[border-color,background-color,backdrop-filter] duration-500 ease-out ${
            isExpanded
              ? "border-white/20 bg-black/40 backdrop-blur-xl"
              : "border-transparent bg-transparent backdrop-blur-0"
          }`}
        >
        {/* Header con freccia */}
        <div
          className={`flex h-10 shrink-0 items-center justify-center border-b transition-[border-color,opacity] duration-500 ease-out ${
            isExpanded
              ? "border-white/10"
              : "border-transparent"
          }`}
        >
          <button
            onClick={toggleExpanded}
            className={`flex h-full w-full items-center justify-center transition-opacity duration-300 hover:text-foreground ${
              showControls ? "text-muted opacity-100" : "opacity-0"
            }`}
            aria-label={isExpanded ? "Riduci chat" : "Espandi chat"}
          >
            {isExpanded ? (
              <ChevronDownIcon className="h-5 w-5" />
            ) : (
              <ChevronUpIcon className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Messaggi container */}
        <div className="relative flex-1 overflow-hidden">
          <div
            className={`flex h-full flex-col gap-3 overflow-x-hidden overflow-y-auto p-4 ${
              isExpanded ? "glass-scroll" : "scrollbar-none chat-fade-top"
            }`}
          >
            <div className="mt-auto" />
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
            <div ref={endRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
