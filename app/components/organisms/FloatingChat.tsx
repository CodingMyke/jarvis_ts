"use client";

import { memo, useRef, useEffect, useState, RefObject } from "react";
import { ChatBubble } from "@/app/components/molecules";
import { Message } from "@/app/lib/speech";
import { ChevronUpIcon, ChevronDownIcon, TrashIcon } from "@/app/components/atoms/icons";

interface FloatingChatProps {
  messages: Message[];
  onReset?: () => void;
}

function useAutoScroll(messages: Message[], isExpanded: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // Keep scroll at bottom during collapse animation
  useEffect(() => {
    if (isExpanded) return;

    const container = containerRef.current;
    if (!container) return;

    // Scroll immediately
    container.scrollTop = container.scrollHeight;

    // Usa requestAnimationFrame invece di setInterval per performance migliori
    let frameId: number | null = null;
    const startTime = Date.now();
    const duration = 1000; // 1 secondo

    const scrollLoop = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        container.scrollTop = container.scrollHeight;
        frameId = requestAnimationFrame(scrollLoop);
      }
    };

    frameId = requestAnimationFrame(scrollLoop);

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [isExpanded]);

  return containerRef;
}

function useFloatingChat(onReset?: () => void) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [dialogState, setDialogState] = useState<"closed" | "opening" | "open" | "closing">("closed");

  const toggleExpanded = () => setIsExpanded((prev) => !prev);
  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  const openResetDialog = () => {
    setDialogState("opening");
    requestAnimationFrame(() => setDialogState("open"));
  };

  const closeResetDialog = () => {
    setDialogState("closing");
    setTimeout(() => setDialogState("closed"), 300); // matches --transition-fast
  };

  const confirmReset = () => {
    onReset?.();
    setIsExpanded(false);
    closeResetDialog();
  };

  const showControls = isHovered || isExpanded;
  const isDialogVisible = dialogState !== "closed";
  const isDialogAnimatedIn = dialogState === "open";

  return {
    isExpanded,
    isHovered,
    showControls,
    isDialogVisible,
    isDialogAnimatedIn,
    toggleExpanded,
    handleMouseEnter,
    handleMouseLeave,
    openResetDialog,
    closeResetDialog,
    confirmReset,
  };
}

function FloatingChatComponent({ messages, onReset }: FloatingChatProps) {
  const {
    isExpanded,
    showControls,
    isDialogVisible,
    isDialogAnimatedIn,
    toggleExpanded,
    handleMouseEnter,
    handleMouseLeave,
    openResetDialog,
    closeResetDialog,
    confirmReset,
  } = useFloatingChat(onReset);
  const scrollContainerRef = useAutoScroll(messages, isExpanded);

  if (messages.length === 0) return null;

  return (
    <>
      <div
        className="floating-chat fixed bottom-6 right-6 z-20 w-md transition-[height] duration-(--transition-medium) ease-(--easing-smooth)"
        style={{ 
          height: isExpanded ? "calc(100vh - 48px)" : "220px",
          willChange: "height"
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
          {/* Header */}
          <div
            className={`flex h-10 shrink-0 items-center border-b transition-[border-color,opacity] duration-(--transition-medium) ${
              isExpanded ? "border-white/10" : "border-transparent"
            }`}
          >
            {/* Spacer per bilanciare */}
            <div className="w-10" />

            {/* Toggle button */}
            <button
              onClick={toggleExpanded}
              className={`flex h-full flex-1 items-center justify-center transition-opacity duration-(--transition-fast) hover:text-foreground ${
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

            {/* Reset button - solo quando espanso */}
            <div className="flex w-10 items-center justify-center">
              {isExpanded && onReset && (
                <button
                  onClick={openResetDialog}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/10 hover:text-red-400"
                  aria-label="Reset conversazione"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Messaggi container */}
          <div className="relative flex-1 overflow-hidden">
            <div
              ref={scrollContainerRef}
              className={`flex h-full flex-col gap-3 overflow-x-hidden overflow-y-auto p-4 ${
                isExpanded ? "glass-scroll" : "scrollbar-none chat-fade-top"
              }`}
            >
              <div className="mt-auto" />
              {messages.map((message) => (
                <ChatBubble key={message.id} message={message} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reset confirmation dialog */}
          {isDialogVisible && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center transition-[background-color,backdrop-filter] duration-(--transition-fast) ${
            isDialogAnimatedIn
              ? "bg-black/60 backdrop-blur-sm"
              : "bg-black/0 backdrop-blur-0"
          }`}
          style={{ willChange: isDialogAnimatedIn ? "backdrop-filter" : "auto" }}
          onClick={closeResetDialog}
        >
          <div
            className={`mx-4 w-full max-w-sm rounded-2xl border border-white/20 bg-black/80 p-6 backdrop-blur-xl transition-[transform,opacity] duration-(--transition-fast) ${
              isDialogAnimatedIn
                ? "scale-100 opacity-100"
                : "scale-95 opacity-0"
            }`}
            style={{ willChange: isDialogAnimatedIn ? "transform, opacity" : "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              Reset conversazione
            </h3>
            <p className="mb-6 text-sm text-muted">
              Sei sicuro di voler cancellare tutta la conversazione? Questa
              azione eliminerà tutti i messaggi e non può essere annullata.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeResetDialog}
                className="rounded-lg px-4 py-2 text-sm text-muted transition-colors hover:bg-white/10 hover:text-foreground"
              >
                Annulla
              </button>
              <button
                onClick={confirmReset}
                className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/30"
              >
                Elimina tutto
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const FloatingChat = memo(FloatingChatComponent, (prev, next) => {
  // Confronta solo la lunghezza e gli ID dei messaggi per performance
  if (prev.messages.length !== next.messages.length) return false;
  
  // Confronta gli ultimi messaggi (più probabili a cambiare)
  const lastIndex = prev.messages.length - 1;
  if (lastIndex >= 0) {
    const prevLast = prev.messages[lastIndex];
    const nextLast = next.messages[lastIndex];
    if (prevLast.id !== nextLast.id || prevLast.text !== nextLast.text) {
      return false;
    }
  }
  
  return prev.onReset === next.onReset;
});
