/**
 * Gemini helpers for chat search metadata and titles.
 * Used only server-side (API routes).
 */

import { GoogleGenAI } from "@google/genai";
import type { ConversationTurn } from "@/app/_features/assistant";

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
 * Generates the text stored in summary_text (chat-level metadata).
 * Used for semantic search and chat switching.
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

  const title = response.text?.trim() || "Chat";
  return title.slice(0, 120);
}
