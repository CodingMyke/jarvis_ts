import type { ConversationTurn } from './types';
import { GEMINI_MODEL } from '../config';

const GEMINI_REST_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const SUMMARIZE_PROMPT = `Sei un assistente che deve creare un riassunto conciso di una conversazione.

REGOLE:
- Riassumi i punti chiave discussi in modo chiaro e sintetico
- Mantieni le informazioni importanti che potrebbero essere utili per conversazioni future
- Scrivi il riassunto in italiano
- Il riassunto deve essere in terza persona
- Non includere saluti o convenevoli
- Concentrati su: domande fatte, risposte date, decisioni prese, informazioni condivise

CONVERSAZIONE DA RIASSUMERE:
`;

interface GeminiRestResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
}

/**
 * Genera un riassunto della conversazione usando l'API REST di Gemini.
 */
export async function summarizeConversation(
  turns: ConversationTurn[],
  apiKey?: string
): Promise<string> {
  const key = apiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Formatta la conversazione come testo
  const conversationText = turns
    .map((turn) => {
      const role = turn.role === 'user' ? 'Utente' : 'Jarvis';
      const text = turn.parts.map((p) => p.text).join(' ');
      return `${role}: ${text}`;
    })
    .join('\n');

  const url = `${GEMINI_REST_URL}/${GEMINI_MODEL}:generateContent?key=${key}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: SUMMARIZE_PROMPT + conversationText }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.3,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Summarization failed: ${error}`);
  }

  const data = (await response.json()) as GeminiRestResponse;
  const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!summary) {
    throw new Error('No summary generated');
  }

  return summary;
}

/**
 * Crea i turns del riassunto nel formato Gemini.
 */
export function createSummaryTurns(summary: string): ConversationTurn[] {
  return [
    {
      role: 'user',
      parts: [
        {
          text: 'Ecco un riassunto della nostra conversazione precedente per contesto:',
        },
      ],
    },
    {
      role: 'model',
      parts: [{ text: summary }],
    },
  ];
}
