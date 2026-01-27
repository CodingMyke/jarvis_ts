import type { SystemToolDefinition } from "../types";

/**
 * Tool per disattivare completamente l'assistente.
 * Va chiamato SOLO quando l'utente dice di tapparsi le orecchie o di disattivarsi.
 * Porta nello stato spento: orb grigio, non in ascolto nemmeno della parola chiave.
 */
export const DISABLE_ASSISTANT_TOOL_NAME = "disableAssistant";

export const disableAssistantTool: SystemToolDefinition = {
  name: DISABLE_ASSISTANT_TOOL_NAME,

  description:
    "Disattiva completamente l'assistente: spegne l'ascolto e torna allo stato spento (orb grigio). " +
    "Usa questo tool SOLO quando l'utente ti chiede esplicitamente di tapparti le orecchie, " +
    "smettere di ascoltare, disattivarti o spegnerti completamente.",

  execute: (_args, context) => {
    context.disableCompletely(2000);
    return {
      result: { success: true, message: "Assistente disattivato" },
    };
  },
};
