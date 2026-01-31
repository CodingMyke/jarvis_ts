import type { SystemToolDefinition } from "../types";

/**
 * Tool per eliminare definitivamente la chat dal database.
 * L'assistente deve chiedere conferma in conversazione prima di chiamarlo.
 */
export const DELETE_CHAT_TOOL_NAME = "deleteChat";

export const deleteChatTool: SystemToolDefinition = {
  name: DELETE_CHAT_TOOL_NAME,

  description:
    "Elimina definitivamente questa chat dal database (tutti i messaggi e la cronologia vengono rimossi). " +
    "Usa questo tool SOLO dopo aver chiesto conferma all'utente e aver ricevuto risposta positiva (es. sì, ok, elimina, conferma). " +
    "Non mostrare dialog di conferma: la conferma avviene in conversazione.",

  execute: async (_args, context) => {
    const outcome = await context.deleteCurrentChat();
    if (outcome.success) {
      return { result: { success: true, message: "Chat eliminata definitivamente" } };
    }
    return { result: { success: false, error: outcome.error ?? "Eliminazione fallita" } };
  },
};
