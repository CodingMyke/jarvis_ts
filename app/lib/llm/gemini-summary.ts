/**
 * Servizio LLM (Gemini) per generazione summary e titolo chat.
 * Usato solo server-side (API routes).
 */

import { GoogleGenAI } from "@google/genai";
import type { ConversationTurn } from "@/app/lib/voice-chat/storage/types";

const GEMINI_TEXT_MODEL = "gemini-2.0-flash";

function getApiKey(): string {
  const key =
    process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!key?.trim()) {
    throw new Error(
      "GEMINI_API_KEY o NEXT_PUBLIC_GEMINI_API_KEY non configurata."
    );
  }
  return key.trim();
}

function turnsToPromptText(turns: ConversationTurn[]): string {
  return turns
    .map((t) => {
      const role = t.role === "user" ? "Utente" : "Modello";
      const text = t.parts.map((p) => p.text).join("");
      return `${role}: ${text}`;
    })
    .join("\n\n");
}

/**
 * Genera un riassunto testuale di N turni di conversazione (per compattazione).
 */
export async function generateSummaryFromTurns(
  turns: ConversationTurn[]
): Promise<string> {
  if (turns.length === 0) return "";

  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const conversationText = turnsToPromptText(turns);

  const response = await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: `Sei un assistente che riassume conversazioni. Produci un unico paragrafo di riassunto in italiano, conciso ma informativo, che conservi i fatti e le decisioni rilevanti. Non aggiungere prefissi tipo "Riassunto:".\n\nConversazione:\n\n${conversationText}`,
    config: {
      maxOutputTokens: 1024,
      temperature: 0.3,
    },
  });

  const text = response.text?.trim() ?? "";
  return text;
}

/**
 * Genera il testo per summary_text (colonna chat): descrizione di cosa tratta l'intera chat.
 * Serve per ricerca semantica / switch chat. Non è il riassunto di compattazione (quello
 * serve solo ad accorciare assistant_history e dare contesto al modello).
 */
export async function generateChatSummaryForSearch(
  assistantHistory: ConversationTurn[]
): Promise<string> {
  if (assistantHistory.length === 0) return "";

  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const conversationText = turnsToPromptText(assistantHistory);

  const response = await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: `Descrivi in 1-2 frasi di cosa tratta questa chat: argomento, tema, focus della conversazione. Serve per la ricerca semantica (trovare la chat giusta). Non riassumere i singoli messaggi: descrivi il tema complessivo. Italiano, conciso. Nessun prefisso tipo "Questa chat parla di".\n\nConversazione:\n\n${conversationText.slice(0, 12000)}`,
    config: {
      maxOutputTokens: 256,
      temperature: 0.2,
    },
  });

  const text = response.text?.trim() ?? "";
  return text.slice(0, 2000);
}

/**
 * Genera un titolo breve per la chat a partire da summary_text o da assistant_history.
 */
export async function generateChatTitle(
  summaryTextOrTurns: string | ConversationTurn[]
): Promise<string> {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const inputText =
    typeof summaryTextOrTurns === "string"
      ? summaryTextOrTurns
      : turnsToPromptText(summaryTextOrTurns);

  if (!inputText.trim()) return "Nuova chat";

  const response = await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: `Genera un titolo brevissimo (max 6-8 parole) per questa chat, in italiano. Rispondi solo con il titolo, niente virgolette né punteggiatura finale.\n\nContenuto:\n\n${inputText}`,
    config: {
      maxOutputTokens: 64,
      temperature: 0.2,
    },
  });

  const title = response.text?.trim() ?? "Chat";
  return title.slice(0, 120);
}
