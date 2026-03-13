import type { ConversationTurn } from './types';

/**
 * Genera un riassunto della conversazione usando l'API REST di Gemini.
 * 
 * TODO: Implementare correttamente la summarization - attualmente disabilitata
 */
export async function summarizeConversation(
  _turns: ConversationTurn[],
  _apiKey?: string
): Promise<string> {
  // TODO: Fix summarization - currently failing, needs investigation
  return '';
}

/**
 * Crea un singolo turno summary (per compattazione assistant_history).
 * Forma: { role: 'model', parts: [{ text: summary }] }.
 */
export function createSummaryTurn(summary: string): ConversationTurn {
  return {
    role: "model",
    parts: [{ text: summary }],
  };
}

/**
 * Crea i turns del riassunto nel formato Gemini (legacy: user + model).
 */
export function createSummaryTurns(summary: string): ConversationTurn[] {
  return [
    {
      role: "user",
      parts: [
        {
          text: "Ecco un riassunto della nostra conversazione precedente per contesto:",
        },
      ],
    },
    {
      role: "model",
      parts: [{ text: summary }],
    },
  ];
}
