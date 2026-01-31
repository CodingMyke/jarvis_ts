import type { SystemToolDefinition } from "../types";

export const CREATE_NEW_CHAT_TOOL_NAME = "createNewChat";

/**
 * Tool per creare una nuova chat e passare a essa.
 * Usato quando l'utente chiede esplicitamente di creare/iniziare una nuova chat.
 * Il messaggio dell'utente non viene salvato nella chat corrente e non riceve risposta;
 * la conversazione termina e si riapre sulla nuova chat vuota.
 */
export const createNewChatTool: SystemToolDefinition = {
  name: CREATE_NEW_CHAT_TOOL_NAME,

  description:
    "Crea una nuova chat e passa a essa. Chiamalo SOLO quando l'utente chiede esplicitamente di creare una nuova chat, iniziare una nuova conversazione o aprire un'altra chat (es. 'crea una nuova chat', 'inizia da capo', 'nuova conversazione'). " +
    "Il messaggio dell'utente non verrà salvato nella chat attuale e non riceverà risposta; la conversazione terminerà e si riaprirà sulla nuova chat vuota.",

  execute: (_args, context) => {
    if (!context.createNewChat) {
      return {
        result: {
          success: false,
          error: "NOT_AVAILABLE",
          errorMessage: "Creazione nuova chat non disponibile in questo contesto.",
        },
      };
    }
    if (context.getIsCurrentChatEmpty?.()) {
      return {
        result: {
          success: false,
          alreadyOnNewChat: true,
          message:
            "L'utente si trova già su una nuova chat (vuota o senza conversazione sostanziale). Informalo che non è necessario crearne un'altra.",
        },
      };
    }
    context.createNewChat();
    return {
      result: {
        success: true,
        message: "Nuova chat creata. La conversazione si riaprirà sulla nuova chat.",
      },
    };
  },
};
