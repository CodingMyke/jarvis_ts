"use client";

import { ChatBubble } from "@/app/design/molecules/assistant/ChatBubble";
import { FloatingChatDeleteDialog } from "@/app/design/molecules/assistant/FloatingChatDeleteDialog";
import { FloatingChatHeader } from "@/app/design/molecules/assistant/FloatingChatHeader";
import { FloatingChatProvider } from "@/app/design/organisms/assistant/floating-chat/FloatingChatContext";
import { useFloatingChatAutoScroll } from "@/app/design/organisms/assistant/floating-chat/useFloatingChatAutoScroll";
import { useFloatingChatContext } from "@/app/design/organisms/assistant/floating-chat/useFloatingChatContext";
import type { Message } from "@/app/_features/assistant/types/speech.types";

interface FloatingChatBodyProps {
  messages: Message[];
  title?: string | null;
  onDeleteChat?: () => void;
}

function FloatingChatBody({
  messages,
  title,
  onDeleteChat,
}: FloatingChatBodyProps) {
  const { isExpanded, handleMouseEnter, handleMouseLeave } = useFloatingChatContext();
  const scrollContainerRef = useFloatingChatAutoScroll(messages, isExpanded);

  return (
    <>
      <div
        className="floating-chat fixed bottom-6 right-6 z-20 w-md transition-[height] duration-(--transition-medium) ease-(--easing-smooth)"
        style={{
          height: isExpanded ? "calc(100vh - 48px)" : "220px",
          willChange: "height",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className={`relative flex h-full flex-col overflow-hidden rounded-2xl border transition-[border-color,background-color,opacity] duration-(--transition-medium) ease-(--easing-smooth) ${
            isExpanded
              ? "border-white/20 bg-black/40 backdrop-blur-xl"
              : "border-transparent bg-transparent backdrop-blur-0"
          }`}
          style={{ willChange: isExpanded ? "backdrop-filter" : "auto" }}
        >
          <FloatingChatHeader title={title} showDeleteAction={Boolean(onDeleteChat)} />
          <div className="relative flex-1 overflow-hidden">
            <div
              ref={scrollContainerRef}
              className={`flex h-full flex-col gap-3 overflow-x-hidden overflow-y-auto p-4 ${
                isExpanded ? "glass-scroll" : "chat-fade-top scrollbar-none"
              }`}
            >
              <div className="mt-auto" />
              {messages.map((message) => (
                <ChatBubble key={message.id} message={message} isExpanded={isExpanded} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <FloatingChatDeleteDialog />
    </>
  );
}

interface FloatingChatProps {
  messages: Message[];
  title?: string | null;
  onDeleteChat?: () => void;
}

export function FloatingChat({
  messages,
  title,
  onDeleteChat,
}: FloatingChatProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <FloatingChatProvider onDeleteChat={onDeleteChat}>
      <FloatingChatBody messages={messages} title={title} onDeleteChat={onDeleteChat} />
    </FloatingChatProvider>
  );
}
