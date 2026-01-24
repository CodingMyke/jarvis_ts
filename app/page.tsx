"use client";

import { Header, MessageList, ChatInput } from "@/app/components";
import { useVoiceChat } from "@/app/hooks/useVoiceChat";

export default function ChatbotPage() {
  const { isRecording, messages, startRecording, stopRecording } = useVoiceChat();

  const handleMicrophoneClick = () => {
    isRecording ? stopRecording() : startRecording();
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header title="Jarvis AI" />
      <MessageList messages={messages} />
      <ChatInput isRecording={isRecording} onMicrophoneClick={handleMicrophoneClick} />
    </div>
  );
}
