import { RESPONSES, THANK_YOU_PATTERNS, WAKE_WORD, DEFAULT_RESPONSE } from "./constants";

const normalize = (text: string): string => text.toLowerCase().trim();

export const containsWakeWord = (message: string): boolean => {
  return normalize(message).includes(WAKE_WORD);
};

export const containsThankYou = (message: string): boolean => {
  const normalizedMessage = normalize(message);
  return THANK_YOU_PATTERNS.some((pattern) => normalizedMessage.includes(pattern));
};

export const resolveResponse = (userMessage: string): string | null => {
  const normalizedMessage = normalize(userMessage);

  if (!containsWakeWord(normalizedMessage)) {
    return null;
  }

  const messageWithoutWakeWord = normalizedMessage.replace(new RegExp(WAKE_WORD, "g"), "").trim();

  for (const [key, response] of Object.entries(RESPONSES)) {
    if (messageWithoutWakeWord.includes(key)) {
      return response;
    }
  }

  return DEFAULT_RESPONSE;
};
