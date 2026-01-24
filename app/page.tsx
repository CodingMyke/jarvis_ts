"use client";

import { Header, MessageList, ChatInput, Button } from "@/app/components";
import { useVoiceChat } from "@/app/hooks/useVoiceChat";

export default function ChatbotPage() {
  const { isListening, messages, startListening, stopListening, error, listeningMode, clearConversation } = useVoiceChat();

  const handleMicrophoneClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Label per mostrare lo stato corrente
  const getStatusLabel = () => {
    switch (listeningMode) {
      case 'wake_word':
        return 'In ascolto... Dì "Jarvis" per iniziare';
      case 'connected':
        return 'Connesso con Jarvis';
      default:
        return null;
    }
  };

  const statusLabel = getStatusLabel();

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header title="Jarvis AI">
        {messages.length > 0 && (
          <Button
            onClick={clearConversation}
            variant="secondary"
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Reset
          </Button>
        )}
      </Header>
      {error && (
        <div className="mx-4 mt-2 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error.message}
        </div>
      )}
      {statusLabel && (
        <div className={`mx-4 mt-2 rounded-lg px-4 py-2 text-center text-sm ${
          listeningMode === 'connected'
            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
        }`}>
          {statusLabel}
        </div>
      )}
      <MessageList messages={messages} />
      <ChatInput isRecording={isListening} onMicrophoneClick={handleMicrophoneClick} />
    </div>
  );
}
