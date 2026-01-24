export const RESPONSES: Record<string, string> = {
  ciao: "Ciao! Come posso aiutarti?",
  "come stai": "Sto bene, grazie! E tu?",
  "che tempo fa": "Non posso controllare il meteo, ma spero sia una bella giornata!",
  "che ore sono": "Non ho accesso all'orologio, ma puoi controllare l'ora sul tuo dispositivo.",
  "chi sei": "Sono Jarvis, il tuo assistente AI vocale!",
  "cosa puoi fare": "Posso rispondere alle tue domande e conversare con te. Prova a chiedermi qualcosa!",
  arrivederci: "Arrivederci! A presto!",
  buongiorno: "Buongiorno! Come posso aiutarti oggi?",
  buonasera: "Buonasera! Come posso aiutarti?",
  buonanotte: "Buonanotte! Sogni d'oro!",
};

export const THANK_YOU_PATTERNS = ["grazie", "grazie mille", "ti ringrazio", "ringrazio"];

export const WAKE_WORD = "jarvis";

export const GOODBYE_RESPONSE = "Prego! Sono felice di esserti stato utile. A presto!";

export const DEFAULT_RESPONSE = "Sì, sono qui! Come posso aiutarti?";

export const SPEECH_CONFIG = {
  lang: "it-IT",
  rate: 0.95,
  pitch: 1.1,
  volume: 1.0,
} as const;
