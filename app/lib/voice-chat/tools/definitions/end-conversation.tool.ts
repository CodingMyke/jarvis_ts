import type { SystemToolDefinition } from "../types";

/**
 * Tool per terminare la conversazione.
 * Viene chiamato dall'assistente quando rileva che l'utente vuole concludere.
 */
export const END_CONVERSATION_TOOL_NAME = "endConversation";

export const endConversationTool: SystemToolDefinition = {
  name: END_CONVERSATION_TOOL_NAME,

  description:
    "Termina la conversazione e chiude la connessione. " +
    "Usa questo tool quando l'utente indica che la conversazione è finita " +
    "(es. 'ok grazie', 'ciao', 'a dopo', 'ho finito', 'perfetto grazie').",

  execute: (_args, context) => {
    // Attendi 2 secondi per permettere all'assistente di salutare,
    // poi termina la conversazione
    context.endConversation(2000);

    return {
      result: { success: true, message: "Conversazione terminata" },
    };
  },
};
