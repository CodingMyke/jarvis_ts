import type { SystemToolDefinition } from "../types";

export const SWITCH_TO_CHAT_TOOL_NAME = "switchToChat";

/**
 * Tool per passare a un'altra chat. Chiamato dall'assistente quando ha trovato
 * la chat su cui l'utente vuole spostarsi (es. dopo searchChats con un solo match).
 * Termina la conversazione corrente e riapre la chat indicata: l'utente vede
 * full_history, l'assistente riceve assistant_history (con eventuali summary).
 */
export const switchToChatTool: SystemToolDefinition = {
  name: SWITCH_TO_CHAT_TOOL_NAME,

  description:
    "Passa alla chat indicata. Chiamalo SOLO quando l'utente ha confermato di voler passare a una chat trovata con searchChats (es. un solo match chiaro o l'utente ha scelto una delle opzioni). La conversazione corrente terminerà e si riaprirà sulla chat selezionata; l'utente e l'assistente vedranno la history corretta di quella chat.",

  parameters: {
    type: "object",
    properties: {
      chat_id: {
        type: "string",
        description: "ID della chat su cui passare (es. chat_id restituito da searchChats).",
      },
    },
    required: ["chat_id"],
  },

  execute: async (args, context) => {
    const chatId = typeof args.chat_id === "string" ? args.chat_id.trim() : "";
    if (!chatId) {
      return {
        result: {
          success: false,
          error: "MISSING_CHAT_ID",
          errorMessage: "Il parametro chat_id è obbligatorio.",
        },
      };
    }
    if (!context.switchToChat) {
      return {
        result: {
          success: false,
          error: "NOT_AVAILABLE",
          errorMessage: "Switch chat non disponibile in questo contesto.",
        },
      };
    }
    context.switchToChat(chatId);
    return {
      result: {
        success: true,
        message: "Passaggio alla chat completato. La conversazione si riaprirà sulla chat selezionata.",
      },
    };
  },
};
