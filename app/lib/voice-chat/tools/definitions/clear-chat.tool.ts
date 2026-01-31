import type { SystemToolDefinition } from "../types";

/**
 * Tool per cancellare tutta la chat.
 * Stesso effetto del pulsante cestino in UI: messaggi e storage azzerati.
 * L'assistente deve chiedere conferma in conversazione prima di chiamarlo.
 */
export const CLEAR_CHAT_TOOL_NAME = "clearChat";

export const clearChatTool: SystemToolDefinition = {
  name: CLEAR_CHAT_TOOL_NAME,

  description:
    "Cancella tutta la conversazione (tutti i messaggi e la cronologia salvata). " +
    "Usa questo tool SOLO dopo aver chiesto conferma all'utente e aver ricevuto risposta positiva (es. sì, ok, elimina, conferma). " +
    "Non mostrare dialog di conferma: la conferma avviene in conversazione.",

  execute: (_args, context) => {
    context.clearConversation();
    return {
      result: { success: true, message: "Conversazione cancellata" },
    };
  },
};
