import { SPEECH_CONFIG } from "./constants";

const isClient = typeof window !== "undefined";

const getBestItalianVoice = (): SpeechSynthesisVoice | null => {
  if (!isClient || !window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();
  const italianVoices = voices.filter((voice) => voice.lang.startsWith("it"));

  if (italianVoices.length === 0) return null;

  const preferredVoice = italianVoices.find((voice) => {
    const name = voice.name.toLowerCase();
    return name.includes("female") || name.includes("zira") || name.includes("elena");
  });

  return preferredVoice ?? italianVoices[0];
};

export const speak = (text: string, onEnd?: () => void): void => {
  if (!isClient || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = SPEECH_CONFIG.lang;
  utterance.rate = SPEECH_CONFIG.rate;
  utterance.pitch = SPEECH_CONFIG.pitch;
  utterance.volume = SPEECH_CONFIG.volume;

  const voice = getBestItalianVoice();
  if (voice) utterance.voice = voice;

  if (onEnd) utterance.onend = onEnd;

  window.speechSynthesis.speak(utterance);
};

export const cancelSpeech = (): void => {
  if (isClient && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};
