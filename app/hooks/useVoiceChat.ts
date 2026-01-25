"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Message } from "@/app/lib/speech/types";
import {
  VoiceChatClient,
  GeminiProvider,
  VoiceChatError,
  WakeWordManager,
  ConversationStorage,
  summarizeConversation,
  createSummaryTurns,
  type ConnectionState,
} from "@/app/lib/voice-chat";
import { JARVIS_CONFIG } from "@/app/lib/voice-chat/jarvis.config";

type ListeningMode = "idle" | "wake_word" | "connected";

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
  startListening: () => void;
  stopListening: () => void;
  toggleMute: () => void;
  clearConversation: () => void;
}

/**
 * Hook per gestire la voice chat con Gemini Live API.
 * Implementa un sistema di wake word: il browser ascolta localmente finché
 * non rileva "Jarvis", poi apre la connessione con Gemini.
 */
export function useVoiceChat(): UseVoiceChatReturn {
  const clientRef = useRef<VoiceChatClient | null>(null);
  const wakeWordRef = useRef<WakeWordManager | null>(null);
  const currentMessageIdRef = useRef<{ user: string | null; ai: string | null }>({ user: null, ai: null });
  const storageRef = useRef<ConversationStorage>(new ConversationStorage());
  const messagesRef = useRef<Message[]>([]);
  
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [listeningMode, setListeningMode] = useState<ListeningMode>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [outputAudioLevel, setOutputAudioLevel] = useState(0);
  const [error, setError] = useState<VoiceChatError | null>(null);

  // Mantieni messagesRef sincronizzato con lo state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Carica la history al mount
  useEffect(() => {
    const saved = storageRef.current.load();
    if (saved && saved.turns.length > 0) {
      // Se la conversazione è riassunta ma il riassunto è vuoto, puliscila e non caricarla
      if (saved.isSummarized) {
        const summaryTurn = saved.turns.find(t => t.role === 'model');
        const summaryText = summaryTurn?.parts.map(p => p.text).join(' ') || '';
        
        // Se il riassunto è vuoto, pulisci la conversazione salvata e non caricarla
        if (!summaryText || summaryText.trim() === '') {
          console.log('[useVoiceChat] saved conversation has empty summary, clearing it');
          storageRef.current.clear();
          return;
        }
      }
      
      const loadedMessages: Message[] = saved.turns.map((turn, index) => ({
        id: `history-${index}`,
        text: turn.parts.map((p) => p.text).join(' '),
        isUser: turn.role === 'user',
        thinking: turn.thinking,
      }));
      setMessages(loadedMessages);
      console.log('[useVoiceChat] loaded history:', loadedMessages.length, 'messages');
    }
  }, []);

  /**
   * Salva la conversazione corrente nel localStorage.
   * Se i messaggi utente sono >= 20, genera prima un riassunto.
   */
  const saveConversation = useCallback(async (currentMessages: Message[]) => {
    const storage = storageRef.current;
    
    // Non salvare conversazioni vuote
    if (currentMessages.length === 0) return;

    if (storage.needsSummarization(currentMessages)) {
      console.log('[useVoiceChat] generating summary...');
      try {
        const turns = storage.messagesToTurns(currentMessages);
        const summary = await summarizeConversation(turns);
        
        // Se il riassunto è vuoto o fallisce, salva la conversazione completa invece del riassunto
        if (!summary || summary.trim() === '') {
          console.log('[useVoiceChat] summary is empty, saving full conversation instead');
          storage.save(currentMessages, false);
          return;
        }
        
        const summaryTurns = createSummaryTurns(summary);
        storage.saveTurns(summaryTurns, true);
        console.log('[useVoiceChat] summary saved');
      } catch (err) {
        console.error('[useVoiceChat] failed to summarize, saving full conversation:', err);
        storage.save(currentMessages, false);
      }
    } else {
      console.log('[useVoiceChat] saving full conversation');
      storage.save(currentMessages, false);
    }
  }, []);

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

  /**
   * Connette a Gemini e invia il messaggio iniziale con la wake word.
   */
  const connectToGemini = useCallback(async (initialMessage: string) => {
    console.log('[useVoiceChat] connectToGemini called with:', initialMessage);
    
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
        onStateChange: (state: ConnectionState) => {
          console.log('[useVoiceChat] state changed:', state);
          setConnectionState(state);
          
          // Gestisci disconnessione inattesa (es. errore WebSocket)
          if (state === 'disconnected' && clientRef.current) {
            console.log('[useVoiceChat] unexpected disconnection, cleaning up...');
            
            // Salva la conversazione prima di pulire
            saveConversation(messagesRef.current);
            
            // Salva ref e resetta PRIMA del dispose per evitare loop
            const client = clientRef.current;
            clientRef.current = null;
            
            // Cleanup client
            client.dispose();
            setIsMuted(false);
            setAudioLevel(0);
            setOutputAudioLevel(0);
            
            // Reset message refs
            currentMessageIdRef.current = { user: null, ai: null };
            
            // Torna in modalità wake word per permettere di riprovare
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
          
          // Salva la conversazione prima di pulire
          saveConversation(messagesRef.current);
          
          // Salva ref e resetta PRIMA del dispose per evitare loop
          const client = clientRef.current;
          clientRef.current = null;
          
          // Cleanup client Gemini
          client?.dispose();
          setIsMuted(false);
          setAudioLevel(0);
          setOutputAudioLevel(0);
          setConnectionState('disconnected');
          
          // Reset message refs per la prossima conversazione
          currentMessageIdRef.current = { user: null, ai: null };
          
          // Torna in modalità wake word
          setListeningMode('wake_word');
          wakeWordRef.current?.resume();
        },
      });

      clientRef.current = client;

      await client.connect();
      await client.startListening();
      
      setListeningMode('connected');
      
      // Carica e invia la history precedente (se esiste)
      const savedConversation = storageRef.current.load();
      if (savedConversation && savedConversation.turns.length > 0) {
        console.log('[useVoiceChat] sending previous conversation history:', 
          savedConversation.isSummarized ? 'summarized' : 'full',
          savedConversation.turns.length, 'turns'
        );
        // turnComplete: false -> il modello aspetta altro input
        client.sendHistory(savedConversation.turns, false);
      }
      
      // Invia il messaggio iniziale che contiene la wake word
      // Aggiungi il messaggio utente alla lista
      const messageId = `${Date.now()}-user`;
      setMessages((prev) => [...prev, { id: messageId, text: initialMessage, isUser: true }]);
      // Reset entrambi per evitare concatenazioni con messaggi della sessione precedente
      currentMessageIdRef.current = { user: null, ai: null };
      
      client.sendText(initialMessage);
      
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
  }, [handleTranscript, saveConversation]);

  /**
   * Avvia l'ascolto in modalità wake word.
   * Il browser ascolta localmente finché non rileva "Jarvis".
   */
  const startListening = useCallback(() => {
    console.log('[useVoiceChat] startListening called');
    
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

  /**
   * Ferma completamente l'ascolto (sia wake word che Gemini).
   */
  const stopListening = useCallback(() => {
    console.log('[useVoiceChat] stopListening called');
    
    // Ferma wake word manager
    wakeWordRef.current?.dispose();
    wakeWordRef.current = null;
    
    // Ferma client Gemini
    clientRef.current?.dispose();
    clientRef.current = null;
    
    setListeningMode('idle');
    setIsMuted(false);
    setAudioLevel(0);
    setOutputAudioLevel(0);
    setConnectionState('disconnected');
  }, []);

  const toggleMute = useCallback(() => {
    if (!clientRef.current) return;
    
    const newMuted = !isMuted;
    clientRef.current.setMuted(newMuted);
    setIsMuted(newMuted);
  }, [isMuted]);

  /**
   * Cancella tutta la conversazione (stato e localStorage).
   */
  const clearConversation = useCallback(() => {
    setMessages([]);
    storageRef.current.clear();
    currentMessageIdRef.current = { user: null, ai: null };
    console.log('[useVoiceChat] conversation cleared');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wakeWordRef.current?.dispose();
      clientRef.current?.dispose();
    };
  }, []);

  return {
    isConnected: connectionState === 'connected',
    isListening: listeningMode !== 'idle',
    isMuted,
    messages,
    audioLevel,
    outputAudioLevel,
    error,
    connectionState,
    listeningMode,
    startListening,
    stopListening,
    toggleMute,
    clearConversation,
  };
}
