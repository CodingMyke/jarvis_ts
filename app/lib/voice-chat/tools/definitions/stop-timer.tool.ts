import type { SystemToolDefinition } from "../types";
import { timerManager } from "@/app/lib/timer";

export const STOP_TIMER_TOOL_NAME = "stopTimer";

/**
 * Tool per fermare il timer attivo.
 * L'assistente può usarlo quando l'utente chiede di fermare o cancellare il timer.
 */
export const stopTimerTool: SystemToolDefinition = {
  name: STOP_TIMER_TOOL_NAME,

  description:
    "Ferma il timer attivo se presente e interrompe il suono di notifica. " +
    "Usa questo tool quando l'utente chiede di fermare, cancellare o interrompere il timer. " +
    "Esempi: 'ferma il timer', 'cancella il timer', 'interrompi il countdown', 'stop timer', 'spegni il suono'.",

  execute: async (_args) => {
    try {
      const activeTimer = timerManager.getActiveTimer();

      if (!activeTimer) {
        return {
          result: {
            success: false,
            error: "NO_ACTIVE_TIMER",
          },
        };
      }

      timerManager.stopTimer(activeTimer.id);
      timerManager.stopNotificationSound();

      return {
        result: {
          success: true,
        },
      };
    } catch (error) {
      console.error("[stopTimerTool] Errore:", error);
      return {
        result: {
          success: false,
          error: "EXECUTION_ERROR",
          errorMessage: error instanceof Error ? error.message : "Errore sconosciuto",
        },
      };
    }
  },
};
