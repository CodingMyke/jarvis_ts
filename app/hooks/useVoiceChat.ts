"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Message } from "@/app/lib/speech/types";
import {
  VoiceChatClient,
  createGeminiProvider,
  VoiceChatError,
  type ConnectionState,
} from "@/app/lib/voice-chat";
import { DEFAULT_VOICE } from "../lib/voice-chat/config";

export interface UseVoiceChatReturn {
  isConnected: boolean;
  isListening: boolean;
  isMuted: boolean;
  messages: Message[];
  audioLevel: number;
  error: VoiceChatError | null;
  connectionState: ConnectionState;
  connect: () => Promise<void>;
  disconnect: () => void;
  toggleMute: () => void;
}

/**
 * Hook per gestire la voice chat con Gemini Live API.
 * Fornisce connessione WebSocket bidirezionale per conversazioni real-time.
 */
export function useVoiceChat(): UseVoiceChatReturn {
  const clientRef = useRef<VoiceChatClient | null>(null);
  const currentMessageIdRef = useRef<{ user: string | null; ai: string | null }>({ user: null, ai: null });
  
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<VoiceChatError | null>(null);

  const handleTranscript = useCallback((text: string, type: 'input' | 'output' | 'thinking'): void => {
    if (type === 'input') {
      // Messaggio utente - reset AI message id
      currentMessageIdRef.current.ai = null;
      
      const currentId = currentMessageIdRef.current.user;
      
      if (currentId) {
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === currentId 
              ? { ...msg, text: msg.text + text }
              : msg
          )
        );
      } else {
        const newId = `${Date.now()}-user`;
        currentMessageIdRef.current.user = newId;
        setMessages((prev) => [...prev, { id: newId, text, isUser: true }]);
      }
    } else {
      // Messaggio AI (thinking o output) - reset user message id
      currentMessageIdRef.current.user = null;
      
      const currentId = currentMessageIdRef.current.ai;
      const field = type === 'thinking' ? 'thinking' : 'text';
      
      if (currentId) {
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === currentId 
              ? { ...msg, [field]: (msg[field] || '') + text }
              : msg
          )
        );
      } else {
        const newId = `${Date.now()}-ai`;
        currentMessageIdRef.current.ai = newId;
        const message: Message = { 
          id: newId, 
          text: type === 'output' ? text : '', 
          isUser: false,
          thinking: type === 'thinking' ? text : undefined,
        };
        setMessages((prev) => [...prev, message]);
      }
    }
  }, []);

  const connect = useCallback(async () => {
    console.log('[useVoiceChat] connect called, clientRef:', clientRef.current);
    
    // Evita connessioni multiple
    if (clientRef.current) {
      console.log('[useVoiceChat] client already exists, returning');
      return;
    }

    setError(null);

    try {
      console.log('[useVoiceChat] creating provider...');
      const provider = createGeminiProvider();

      console.log('[useVoiceChat] creating client...');
      const client = new VoiceChatClient({
        provider,
        config: {
          voice: DEFAULT_VOICE,
          language: 'it-IT',
          systemPrompt: 'Sei Jarvis, un assistente personale italiano. Parla sempre in italiano con un accento naturale e fluente. Rispondi in modo coinciso e breve. Qualsiasi cosa ti chiedo dammi le minime informazioni che ritieni che mi servino per risolvere/comprendere quello che ti ho chiesto in modo da mantenere la conversazione breve e concisa. Niente giri di parole o ripetizioni, vai dritto al punto. Vai nello specifico e dilungati SOLO se espressamente richiesto.',
        },
        tools: [], // Lista vuota, pronta per futuro function calling
        onTranscript: handleTranscript,
        onStateChange: (state: ConnectionState) => {
          console.log('[useVoiceChat] state changed:', state);
          setConnectionState(state);
        },
        onError: (err: VoiceChatError) => {
          console.error('[useVoiceChat] error:', err);
          setError(err);
        },
        onAudioLevel: setAudioLevel,
      });

      clientRef.current = client;

      console.log('[useVoiceChat] connecting...');
      await client.connect();
      console.log('[useVoiceChat] connected! starting listening...');
      await client.startListening();
      console.log('[useVoiceChat] listening started!');
      
      setIsListening(true);
    } catch (err) {
      console.error('[useVoiceChat] catch error:', err);
      const voiceError = err instanceof VoiceChatError
        ? err
        : new VoiceChatError(
            err instanceof Error ? err.message : 'Unknown error',
            'UNKNOWN_ERROR',
            false
          );
      setError(voiceError);
      
      // Cleanup in caso di errore
      clientRef.current?.dispose();
      clientRef.current = null;
    }
  }, [handleTranscript]);

  const disconnect = useCallback(() => {
    clientRef.current?.dispose();
    clientRef.current = null;
    
    setIsListening(false);
    setIsMuted(false);
    setAudioLevel(0);
    setConnectionState('disconnected');
  }, []);

  const toggleMute = useCallback(() => {
    if (!clientRef.current) return;
    
    const newMuted = !isMuted;
    clientRef.current.setMuted(newMuted);
    setIsMuted(newMuted);
  }, [isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clientRef.current?.dispose();
    };
  }, []);

  return {
    isConnected: connectionState === 'connected',
    isListening,
    isMuted,
    messages,
    audioLevel,
    error,
    connectionState,
    connect,
    disconnect,
    toggleMute,
  };
}
