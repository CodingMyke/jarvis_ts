"use client";

import { Header, MessageList, ChatInput } from "@/app/components";
import { useVoiceChat } from "@/app/hooks/useVoiceChat";

export default function ChatbotPage() {
  const { isListening, messages, connect, disconnect, error } = useVoiceChat();

  const handleMicrophoneClick = () => {
    if (isListening) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header title="Jarvis AI" />
      {error && (
        <div className="mx-4 mt-2 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error.message}
        </div>
      )}
      <MessageList messages={messages} />
      <ChatInput isRecording={isListening} onMicrophoneClick={handleMicrophoneClick} />
    </div>
  );
}
