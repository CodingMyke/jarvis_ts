"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Message,
  VoiceChatHook,
  GOODBYE_RESPONSE,
  containsWakeWord,
  containsThankYou,
  resolveResponse,
  speak,
  cancelSpeech,
} from "@/app/lib/speech";

const SPEECH_RECOGNITION_CONFIG = {
  lang: "it-IT",
  continuous: true,
  interimResults: false,
} as const;

export function useVoiceChat(): VoiceChatHook {
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isSpeakingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const restartRecognitionRef = useRef<(() => void) | null>(null);

  const addMessage = useCallback((text: string, isUser: boolean): Message => {
    const message: Message = {
      id: `${Date.now()}-${isUser ? "user" : "ai"}`,
      text,
      isUser,
    };
    setMessages((prev) => [...prev, message]);
    return message;
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    isRecordingRef.current = false;
    isSpeakingRef.current = false;

    recognitionRef.current?.stop();
    recognitionRef.current = null;
    cancelSpeech();
  }, []);

  const createRecognition = useCallback((): SpeechRecognition | null => {
    if (typeof window === "undefined") return null;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = SPEECH_RECOGNITION_CONFIG.lang;
    recognition.continuous = SPEECH_RECOGNITION_CONFIG.continuous;
    recognition.interimResults = SPEECH_RECOGNITION_CONFIG.interimResults;

    return recognition;
  }, []);

  const restartRecognition = useCallback(() => {
    if (!isRecordingRef.current) return;

    const recognition = createRecognition();
    if (!recognition) return;

    recognition.onresult = (event) => {
      if (isSpeakingRef.current) return;

      const lastResult = event.results[event.results.length - 1];
      if (!lastResult.isFinal) return;

      const transcript = lastResult[0].transcript.trim();
      if (!transcript || !containsWakeWord(transcript)) return;

      addMessage(transcript, true);

      if (containsThankYou(transcript)) {
        addMessage(GOODBYE_RESPONSE, false);
        speak(GOODBYE_RESPONSE, stopRecording);
        return;
      }

      const response = resolveResponse(transcript);
      if (!response) return;

      addMessage(response, false);
      isSpeakingRef.current = true;
      recognition.stop();

      speak(response, () => {
        isSpeakingRef.current = false;
        if (isRecordingRef.current) restartRecognitionRef.current?.();
      });
    };

    recognition.onerror = (event) => {
      const { error } = event;

      if (error === "no-speech" || error === "network") {
        setTimeout(() => {
          if (isRecordingRef.current && !isSpeakingRef.current) {
            restartRecognitionRef.current?.();
          }
        }, error === "network" ? 1000 : 0);
        return;
      }

      if (error === "not-allowed" || error === "permission-denied") {
        alert("Permessi del microfono negati. Consenti l'accesso nelle impostazioni del browser.");
      }

      stopRecording();
    };

    recognition.onend = () => {
      if (!isSpeakingRef.current && isRecordingRef.current) {
        restartRecognitionRef.current?.();
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, [addMessage, createRecognition, stopRecording]);

  useEffect(() => {
    restartRecognitionRef.current = restartRecognition;
  }, [restartRecognition]);

  const startRecording = useCallback(async () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Il riconoscimento vocale non è supportato nel tuo browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      alert("Impossibile accedere al microfono. Verifica i permessi nelle impostazioni.");
      return;
    }

    setIsRecording(true);
    isRecordingRef.current = true;
    restartRecognition();
  }, [restartRecognition]);

  return { isRecording, messages, startRecording, stopRecording };
}
