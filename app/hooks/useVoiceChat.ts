"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

interface VoiceChatHook {
  isRecording: boolean;
  messages: Message[];
  startRecording: () => void;
  stopRecording: () => void;
}

const RESPONSES: Record<string, string> = {
  ciao: "Ciao! Come posso aiutarti?",
  "come stai": "Sto bene, grazie! E tu?",
  "che tempo fa": "Non posso controllare il meteo, ma spero sia una bella giornata!",
  "che ore sono": "Non ho accesso all'orologio, ma puoi controllare l'ora sul tuo dispositivo.",
  "chi sei": "Sono Jarvis, il tuo assistente AI vocale!",
  "cosa puoi fare": "Posso rispondere alle tue domande e conversare con te. Prova a chiedermi qualcosa!",
  "arrivederci": "Arrivederci! A presto!",
  "buongiorno": "Buongiorno! Come posso aiutarti oggi?",
  "buonasera": "Buonasera! Come posso aiutarti?",
  "buonanotte": "Buonanotte! Sogni d'oro!",
};

const THANK_YOU_PATTERNS = ["grazie", "grazie mille", "ti ringrazio", "ringrazio"];

const containsJarvis = (message: string): boolean => {
  const normalizedMessage = message.toLowerCase().trim();
  return normalizedMessage.includes("jarvis");
};

const containsThankYou = (message: string): boolean => {
  const normalizedMessage = message.toLowerCase().trim();
  return THANK_YOU_PATTERNS.some((pattern) => normalizedMessage.includes(pattern));
};

const getResponse = (userMessage: string): string | null => {
  const normalizedMessage = userMessage.toLowerCase().trim();
  
  // Se non contiene "jarvis", non rispondere
  if (!containsJarvis(normalizedMessage)) {
    return null;
  }
  
  // Rimuovi "jarvis" dal messaggio per cercare la risposta
  const messageWithoutJarvis = normalizedMessage.replace(/jarvis/g, "").trim();
  
  for (const [key, response] of Object.entries(RESPONSES)) {
    if (messageWithoutJarvis.includes(key)) {
      return response;
    }
  }
  
  return "Sì, sono qui! Come posso aiutarti?";
};

const getBestItalianVoice = (): SpeechSynthesisVoice | null => {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  
  // Cerca una voce italiana preferibilmente femminile
  const italianVoices = voices.filter(
    (voice) => voice.lang.startsWith("it") || voice.lang.startsWith("it-IT")
  );

  if (italianVoices.length === 0) {
    return null;
  }

  // Preferisci voci femminili (spesso hanno nomi che contengono "female" o sono più naturali)
  const femaleVoice = italianVoices.find(
    (voice) =>
      voice.name.toLowerCase().includes("female") ||
      voice.name.toLowerCase().includes("zira") ||
      voice.name.toLowerCase().includes("elena")
  );

  if (femaleVoice) {
    return femaleVoice;
  }

  // Altrimenti usa la prima voce italiana disponibile
  return italianVoices[0];
};

const speakText = (
  text: string,
  onEnd?: () => void
): SpeechSynthesisUtterance | null => {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return null;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "it-IT";
  
  // Seleziona la migliore voce italiana disponibile
  const voice = getBestItalianVoice();
  if (voice) {
    utterance.voice = voice;
  }
  
  // Impostazioni per una voce più naturale e piacevole
  utterance.rate = 0.95; // Leggermente più lento per suonare più naturale
  utterance.pitch = 1.1; // Pitch leggermente più alto per una voce più chiara
  utterance.volume = 1.0;

  if (onEnd) {
    utterance.onend = onEnd;
  }

  window.speechSynthesis.speak(utterance);
  return utterance;
};

export function useVoiceChat(): VoiceChatHook {
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isSpeakingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const restartRecognitionRef = useRef<(() => void) | null>(null);
  const stopRecordingRef = useRef<(() => void) | null>(null);

  const restartRecognition = useCallback(() => {
    if (typeof window === "undefined" || !isRecordingRef.current) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "it-IT";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      if (isSpeakingRef.current) return;

      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript.trim();

      if (transcript && lastResult.isFinal) {
        // Se non contiene "jarvis", ignora completamente il messaggio
        if (!containsJarvis(transcript)) {
          return;
        }

        const userMessage: Message = {
          id: Date.now().toString(),
          text: transcript,
          isUser: true,
        };

        setMessages((prev) => [...prev, userMessage]);

        // Controlla se contiene ringraziamenti - se sì, termina la conversazione
        if (containsThankYou(transcript)) {
          const goodbyeMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: "Prego! Sono felice di esserti stato utile. A presto!",
            isUser: false,
          };
          setMessages((prev) => [...prev, goodbyeMessage]);
          
          speakText(goodbyeMessage.text, () => {
            if (stopRecordingRef.current) {
              stopRecordingRef.current();
            }
          });
          return;
        }

        // Ottieni la risposta (ora sappiamo che contiene "jarvis")
        const responseText = getResponse(transcript);
        if (!responseText) {
          return;
        }

        const aiResponse: Message = {
          id: (Date.now() + 2).toString(),
          text: responseText,
          isUser: false,
        };

        setMessages((prev) => [...prev, aiResponse]);

        isSpeakingRef.current = true;
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }

        speakText(responseText, () => {
          isSpeakingRef.current = false;
          if (isRecordingRef.current && restartRecognitionRef.current) {
            restartRecognitionRef.current();
          }
        });
      }
    };

    recognition.onerror = (event) => {
      console.error("Errore riconoscimento vocale:", event.error);
      
      if (event.error === "no-speech") {
        if (!isSpeakingRef.current && isRecordingRef.current && restartRecognitionRef.current) {
          restartRecognitionRef.current();
        }
        return;
      }
      
      if (event.error === "network") {
        console.error("Errore di rete nel riconoscimento vocale. Verifica la connessione e i permessi del microfono.");
        // Riprova dopo un breve delay
        setTimeout(() => {
          if (isRecordingRef.current && restartRecognitionRef.current) {
            restartRecognitionRef.current();
          }
        }, 1000);
        return;
      }
      
      if (event.error === "not-allowed" || event.error === "permission-denied") {
        alert("Permessi del microfono negati. Per favore, consenti l'accesso al microfono nelle impostazioni del browser.");
        setIsRecording(false);
        isRecordingRef.current = false;
        return;
      }
      
      setIsRecording(false);
      isRecordingRef.current = false;
    };

    recognition.onend = () => {
      if (!isSpeakingRef.current && isRecordingRef.current && restartRecognitionRef.current) {
        restartRecognitionRef.current();
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    restartRecognitionRef.current = restartRecognition;
  }, [restartRecognition]);

  const startRecording = useCallback(async () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Il riconoscimento vocale non è supportato nel tuo browser.");
      return;
    }

    // Richiedi permessi del microfono esplicitamente
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Chiudi lo stream immediatamente, serve solo per richiedere i permessi
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.error("Errore permessi microfono:", error);
      alert("Impossibile accedere al microfono. Verifica i permessi nelle impostazioni del browser.");
      return;
    }

    setIsRecording(true);
    isRecordingRef.current = true;
    restartRecognition();
  }, [restartRecognition]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    isRecordingRef.current = false;
    isSpeakingRef.current = false;
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  return {
    isRecording,
    messages,
    startRecording,
    stopRecording,
  };
}

