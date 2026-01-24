"use client";

import { useEffect, useRef } from "react";
import { useVoiceChat } from "./hooks/useVoiceChat";

export default function Chatbot() {
  const { isRecording, messages, startRecording, stopRecording } = useVoiceChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleMicrophoneClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-lg font-semibold text-foreground">Jarvis AI</h1>
      </header>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 && (
            <>
              {/* Welcome Message */}
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-zinc-100 px-4 py-2 text-foreground dark:bg-zinc-800">
                  <p className="text-sm">Ciao! Sono Jarvis, il tuo assistente AI vocale. Premi il pulsante del microfono per iniziare a conversare!</p>
                </div>
              </div>
            </>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  message.isUser
                    ? "rounded-tr-sm bg-blue-500 text-white"
                    : "rounded-tl-sm bg-zinc-100 text-foreground dark:bg-zinc-800"
                }`}
              >
                <p className="text-sm">{message.text}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Scrivi un messaggio..."
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-foreground placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:placeholder-zinc-500"
            />
            <button
              type="button"
              onClick={handleMicrophoneClick}
              className={`flex items-center justify-center rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                isRecording
                  ? "border-red-500 bg-red-500 text-white hover:bg-red-600 dark:border-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                  : "border-zinc-300 bg-white text-foreground hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              }`}
              aria-label={isRecording ? "Ferma chat vocale" : "Avvia chat vocale"}
            >
              {isRecording ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
            <button
              type="button"
              className="rounded-lg bg-blue-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
          >
              Invia
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
