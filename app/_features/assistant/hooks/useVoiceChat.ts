"use client";

import { useSyncExternalStore } from "react";
import {
  VoiceChatError,
  type AssistantSessionState,
  type ConnectionState,
} from "@/app/_features/assistant/lib";
import type { Message } from "@/app/_features/assistant/types/speech.types";
import { useVoiceChatRuntime } from "../runtime/useVoiceChatRuntime";

export interface UseVoiceChatReturn {
  isConnected: boolean;
  isListening: boolean;
  isMuted: boolean;
  messages: Message[];
  audioLevel: number;
  outputAudioLevel: number;
  error: VoiceChatError | null;
  connectionState: ConnectionState;
  listeningMode: AssistantSessionState;
  /** ID chat corrente (backend); null se non ancora creata/caricata. */
  chatId: string | null;
  /** Titolo della chat corrente; null se assente o chat non ancora caricata. */
  chatTitle: string | null;
  startListening: () => void;
  stopListening: () => void;
  toggleMute: () => void;
  /** Elimina la chat corrente dal database e riapre in stato pulito (conferma in UI o a voce). */
  deleteChat: () => void;
}

export interface UseVoiceChatOptions {
  initialChatId?: string | null;
  onToolExecuted?: (toolName: string, result: unknown) => void;
}

export function useVoiceChat(options?: UseVoiceChatOptions): UseVoiceChatReturn {
  void options;
  const runtime = useVoiceChatRuntime();
  const snapshot = useSyncExternalStore(
    runtime.subscribe,
    runtime.getSnapshot,
    runtime.getSnapshot,
  );

  return {
    isConnected: snapshot.connectionState === "connected",
    isListening: snapshot.listeningMode !== "idle",
    isMuted: snapshot.isMuted,
    messages: snapshot.messages as Message[],
    audioLevel: snapshot.audioLevel,
    outputAudioLevel: snapshot.outputAudioLevel,
    error: snapshot.error as VoiceChatError | null,
    connectionState: snapshot.connectionState as ConnectionState,
    listeningMode: snapshot.listeningMode as AssistantSessionState,
    chatId: snapshot.chatId,
    chatTitle: snapshot.chatTitle,
    startListening: () => runtime.startListening(),
    stopListening: () => runtime.stopListening(),
    toggleMute: () => runtime.toggleMute(),
    deleteChat: () => {
      void runtime.deleteCurrentChat();
    },
  };
}
