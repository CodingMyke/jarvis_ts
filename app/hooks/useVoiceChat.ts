"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Message } from "@/app/lib/speech/types";
import {
  VoiceChatClient,
  GeminiProvider,
  VoiceChatError,
  WakeWordManager,
  ConversationStorage,
  type ConnectionState,
  type ConversationTurn,
} from "@/app/lib/voice-chat";
import { JARVIS_CONFIG } from "@/app/lib/voice-chat/jarvis.config";

type ListeningMode = "idle" | "wake_word" | "connected";

const INACTIVITY_MS = 20_000;
/** Ritardo prima di disconnettere e riaprire dopo clearChat (consente l'invio della risposta del tool). */
const CLEAR_AND_RECONNECT_DELAY_MS = 400;

export interface UseVoiceChatReturn {
  isConnected: boolean;
  isListening: boolean;
  isMuted: boolean;
  messages: Message[];
  audioLevel: number;
  outputAudioLevel: number;
  error: VoiceChatError | null;
  connectionState: ConnectionState;
  listeningMode: ListeningMode;
  /** ID chat corrente (backend); null se non ancora creata/caricata. */
  chatId: string | null;
  startListening: () => void;
  stopListening: () => void;
  toggleMute: () => void;
  clearConversation: () => void;
}

export interface UseVoiceChatOptions {
  /** ID chat da caricare all'avvio (GET); se assente la chat resta vuota e il record si crea al primo salvataggio. */
  initialChatId?: string | null;
  onToolExecuted?: (toolName: string, result: unknown) => void;
}

/**
 * Hook per gestire la voice chat con Gemini Live API.
 * Implementa un sistema di wake word: il browser ascolta localmente finché
 * non rileva "Jarvis", poi apre la connessione con Gemini.
 */
export function useVoiceChat(options?: UseVoiceChatOptions): UseVoiceChatReturn {
  const clientRef = useRef<VoiceChatClient | null>(null);
  const wakeWordRef = useRef<WakeWordManager | null>(null);
  const currentMessageIdRef = useRef<{ user: string | null; ai: string | null }>({ user: null, ai: null });
  const storageRef = useRef<ConversationStorage>(new ConversationStorage());
  const messagesRef = useRef<Message[]>([]);
  const inactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectToGeminiRef = useRef<(msg?: string) => Promise<void>>(null as unknown as (msg?: string) => Promise<void>);
  const chatIdRef = useRef<string | null>(options?.initialChatId ?? null);
  const lastSavedTurnCountRef = useRef(0);

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [listeningMode, setListeningMode] = useState<ListeningMode>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [outputAudioLevel, setOutputAudioLevel] = useState(0);
  const [error, setError] = useState<VoiceChatError | null>(null);
  const [chatId, setChatId] = useState<string | null>(options?.initialChatId ?? null);

  // Mantieni messagesRef sincronizzato con lo state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /**
   * Salva la conversazione: se chatId presente, PATCH /api/chats (append delta);
   * se nessun chatId ma ci sono messaggi, POST per creare la chat (record creato al primo salvataggio).
   */
  const saveConversation = useCallback(async (currentMessages: Message[]) => {
    if (currentMessages.length === 0) return;

    const cid = chatIdRef.current;
    const storage = storageRef.current;
    const turns = storage.messagesToTurns(currentMessages);

    if (cid) {
      const from = lastSavedTurnCountRef.current;
      const newTurns = turns.slice(from);
      if (newTurns.length === 0) return;
      try {
        const res = await fetch("/api/chats", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: cid, turns: newTurns }),
          credentials: "same-origin",
        });
        if (res.ok) {
          lastSavedTurnCountRef.current = turns.length;
        }
      } catch (err) {
        console.error("[useVoiceChat] PATCH /api/chats failed", err);
      }
      return;
    }

    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turns }),
        credentials: "same-origin",
      });
      if (res.ok) {
        const data = (await res.json()) as { success?: boolean; chat?: { id: string } };
        if (data.success && data.chat?.id) {
          chatIdRef.current = data.chat.id;
          setChatId(data.chat.id);
          lastSavedTurnCountRef.current = turns.length;
        }
      }
    } catch (err) {
      console.error("[useVoiceChat] POST /api/chats failed", err);
    }
  }, []);

  /**
   * Porta l'assistente in stato idle (orb grigio, nessun ascolto).
   * Punto unico per orb cliccata dall'utente e tool disableAssistant.
   */
  const goToIdle = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
    saveConversation(messagesRef.current);
    wakeWordRef.current?.dispose();
    wakeWordRef.current = null;
    clientRef.current?.dispose();
    clientRef.current = null;
    setIsMuted(false);
    setAudioLevel(0);
    setOutputAudioLevel(0);
    setConnectionState('disconnected');
    currentMessageIdRef.current = { user: null, ai: null };
    setListeningMode('idle');
  }, [saveConversation]);

  /**
   * Disconnette da Gemini e torna in ascolto wake word (stesso esito di endConversation).
   */
  const goToWakeWord = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
    saveConversation(messagesRef.current);
    const client = clientRef.current;
    clientRef.current = null;
    client?.dispose();
    setIsMuted(false);
    setAudioLevel(0);
    setOutputAudioLevel(0);
    setConnectionState('disconnected');
    currentMessageIdRef.current = { user: null, ai: null };
    setListeningMode('wake_word');
    wakeWordRef.current?.resume();
  }, [saveConversation]);

  /**
   * Cancella tutta la conversazione (stato e chatId). Stesso effetto del pulsante cestino in UI.
   */
  const clearConversation = useCallback(() => {
    setMessages([]);
    chatIdRef.current = null;
    setChatId(null);
    lastSavedTurnCountRef.current = 0;
    storageRef.current.clear();
    currentMessageIdRef.current = { user: null, ai: null };
  }, []);

  /**
   * Chiusura connessione e riapertura pulita (usato dal tool clearChat).
   * Dopo un breve delay per permettere la risposta del tool: clear, disconnect, reconnect.
   */
  const clearConversationAndReconnect = useCallback(() => {
    clearConversation();
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
    const client = clientRef.current;
    clientRef.current = null;
    client?.dispose();
    setIsMuted(false);
    setAudioLevel(0);
    setOutputAudioLevel(0);
    setConnectionState("disconnected");
    currentMessageIdRef.current = { user: null, ai: null };
    setListeningMode("wake_word");
    connectToGeminiRef.current(`Ciao ${JARVIS_CONFIG.assistantName}`);
  }, [clearConversation]);

  /**
   * Passa a un'altra chat: salva la corrente, imposta il nuovo chatId, termina
   * la conversazione e riapre sulla chat indicata (usato dal tool switchToChat).
   * L'utente vedrà full_history, l'assistente riceverà assistant_history.
   */
  const switchToChatAndReconnect = useCallback(
    (newChatId: string) => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
      saveConversation(messagesRef.current);
      chatIdRef.current = newChatId;
      setChatId(newChatId);
      setMessages([]);
      currentMessageIdRef.current = { user: null, ai: null };
      const client = clientRef.current;
      clientRef.current = null;
      client?.dispose();
      setIsMuted(false);
      setAudioLevel(0);
      setOutputAudioLevel(0);
      setConnectionState("disconnected");
      setListeningMode("wake_word");
      wakeWordRef.current?.resume();
      setTimeout(() => {
        connectToGeminiRef.current();
      }, CLEAR_AND_RECONNECT_DELAY_MS);
    },
    [saveConversation]
  );

  /**
   * Annulla il timeout di inattività (es. utente ha ripreso a parlare).
   */
  const clearInactivityTimeout = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  }, []);

  /**
   * Programma il ritorno a wake word dopo INACTIVITY_MS senza input utente.
   * Va chiamato solo quando l'assistente ha terminato il turno (onTurnComplete):
   * in attesa di messaggio utente, se non arriva in 20s disconnetto.
   */
  const scheduleInactivityTimeout = useCallback(() => {
    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    if (!clientRef.current) return;
    inactivityTimeoutRef.current = setTimeout(goToWakeWord, INACTIVITY_MS);
  }, [goToWakeWord]);

  const handleTranscript = useCallback((text: string, type: 'input' | 'output' | 'thinking'): void => {
    if (type === 'input') {
      clearInactivityTimeout();
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
  }, [clearInactivityTimeout]);

  /**
   * Connette a Gemini. Se initialMessage è fornito (es. wake word), lo invia e lo aggiunge alla UI;
   * altrimenti (es. switch chat) solo connessione e caricamento history, nessun messaggio aggiunto.
   */
  const connectToGemini = useCallback(async (initialMessage?: string) => {
    // Evita connessioni multiple
    if (clientRef.current) {
      console.log('[useVoiceChat] client already exists');
      return;
    }

    setError(null);

    try {
      const provider = new GeminiProvider();

      const client = new VoiceChatClient({
        provider,
        config: {
          voice: JARVIS_CONFIG.voice,
          language: JARVIS_CONFIG.language,
          systemPrompt: JARVIS_CONFIG.systemPrompt,
        },
        tools: [],
        onTranscript: handleTranscript,
        onToolExecuted: options?.onToolExecuted,
        onStateChange: (state: ConnectionState) => {
          setConnectionState(state);
          
          // Gestisci disconnessione inattesa (es. errore WebSocket)
          if (state === 'disconnected' && clientRef.current) {
            console.log('[useVoiceChat] unexpected disconnection, cleaning up...');
            if (inactivityTimeoutRef.current) {
              clearTimeout(inactivityTimeoutRef.current);
              inactivityTimeoutRef.current = null;
            }
            saveConversation(messagesRef.current);
            const client = clientRef.current;
            clientRef.current = null;
            client.dispose();
            setIsMuted(false);
            setAudioLevel(0);
            setOutputAudioLevel(0);
            currentMessageIdRef.current = { user: null, ai: null };
            setListeningMode('wake_word');
            wakeWordRef.current?.resume();
          }
        },
        onError: (err: VoiceChatError) => {
          console.error('[useVoiceChat] error:', err);
          setError(err);
        },
        onAudioLevel: setAudioLevel,
        onOutputAudioLevel: setOutputAudioLevel,
        onEndConversation: () => {
          console.log('[useVoiceChat] conversation ended by assistant');
          goToWakeWord();
        },
        onTurnComplete: scheduleInactivityTimeout,
        onDisableCompletely: goToIdle,
        onClearConversation: () => {
          setTimeout(
            () => clearConversationAndReconnect(),
            CLEAR_AND_RECONNECT_DELAY_MS
          );
        },
        onSwitchToChat: (newChatId: string) => {
          setTimeout(
            () => switchToChatAndReconnect(newChatId),
            CLEAR_AND_RECONNECT_DELAY_MS
          );
        },
      });

      clientRef.current = client;

      await client.connect();
      await client.startListening();
      setListeningMode("connected");

      let assistantHistoryToSend: ConversationTurn[] | null = null;
      const cid = chatIdRef.current;

      if (cid) {
        const res = await fetch(`/api/chats?id=${encodeURIComponent(cid)}`, { credentials: "same-origin" });
        if (res.ok) {
          const data = (await res.json()) as { success: boolean; chat?: { full_history: ConversationTurn[]; assistant_history: ConversationTurn[] } };
          if (data.success && data.chat) {
            const full = Array.isArray(data.chat.full_history) ? data.chat.full_history : [];
            const asst = Array.isArray(data.chat.assistant_history) ? data.chat.assistant_history : [];
            const loadedMessages: Message[] = full.map((turn, i) => ({
              id: `history-${i}`,
              text: turn.parts?.map((p) => p.text).join(" ") ?? "",
              isUser: turn.role === "user",
              thinking: turn.thinking,
            }));
            setMessages(loadedMessages);
            lastSavedTurnCountRef.current = full.length;
            assistantHistoryToSend = asst;
          }
        } else {
          chatIdRef.current = null;
          setChatId(null);
        }
      }

      if (assistantHistoryToSend && assistantHistoryToSend.length > 0) {
        client.sendHistory(assistantHistoryToSend, false);
      }

      const hasInitialMessage = typeof initialMessage === "string" && initialMessage.trim().length > 0;
      if (hasInitialMessage) {
        const messageId = `${Date.now()}-user`;
        setMessages((prev) => [...prev, { id: messageId, text: initialMessage, isUser: true }]);
        currentMessageIdRef.current = { user: null, ai: null };
        client.sendText(initialMessage);
        if (!chatIdRef.current) {
          const firstTurn: ConversationTurn = { role: "user", parts: [{ text: initialMessage }] };
          try {
            const res = await fetch("/api/chats", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ turns: [firstTurn] }),
              credentials: "same-origin",
            });
            if (res.ok) {
              const data = (await res.json()) as { success?: boolean; chat?: { id: string } };
              if (data.success && data.chat?.id) {
                chatIdRef.current = data.chat.id;
                setChatId(data.chat.id);
                lastSavedTurnCountRef.current = 1;
              }
            }
          } catch (err) {
            console.error("[useVoiceChat] POST /api/chats (first message) failed", err);
          }
        }
      }

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
      
      clientRef.current?.dispose();
      clientRef.current = null;
      
      // Torna in wake word mode in caso di errore
      setListeningMode('wake_word');
      wakeWordRef.current?.resume();
    }
  }, [handleTranscript, saveConversation, options, goToIdle, goToWakeWord, scheduleInactivityTimeout, clearConversationAndReconnect, switchToChatAndReconnect]);

  useEffect(() => {
    connectToGeminiRef.current = connectToGemini;
  }, [connectToGemini]);

  /**
   * Avvia l'ascolto in modalità wake word.
   * Il browser ascolta localmente finché non rileva "Jarvis".
   */
  const startListening = useCallback(() => {
    if (listeningMode !== 'idle') {
      console.log('[useVoiceChat] already listening, mode:', listeningMode);
      return;
    }

    setError(null);

    // Crea il wake word manager
    wakeWordRef.current = new WakeWordManager({
      keyword: JARVIS_CONFIG.wakeWord,
      language: JARVIS_CONFIG.language,
      onWakeWord: (transcript) => {
        console.log('[useVoiceChat] wake word detected:', transcript);
        connectToGemini(transcript);
      },
      onError: (err) => {
        console.error('[useVoiceChat] wake word error:', err);
        setError(new VoiceChatError(err.message, 'AUDIO_ERROR', true));
      },
    });

    wakeWordRef.current.start();
    setListeningMode('wake_word');
  }, [listeningMode, connectToGemini]);

  const toggleMute = useCallback(() => {
    if (!clientRef.current) return;
    
    const newMuted = !isMuted;
    clientRef.current.setMuted(newMuted);
    setIsMuted(newMuted);
  }, [isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
      wakeWordRef.current?.dispose();
      clientRef.current?.dispose();
    };
  }, []);

  return {
    isConnected: connectionState === "connected",
    isListening: listeningMode !== "idle",
    isMuted,
    messages,
    audioLevel,
    outputAudioLevel,
    error,
    connectionState,
    listeningMode,
    chatId,
    startListening,
    stopListening: goToIdle,
    toggleMute,
    clearConversation,
  };
}
