import type { SystemToolDefinition } from "../types";
import { timerManager } from "@/app/lib/timer";

export const RESUME_TIMER_TOOL_NAME = "resumeTimer";

/**
 * Tool per riprendere il timer in pausa.
 * L'assistente può usarlo quando l'utente chiede di riprendere il timer.
 */
export const resumeTimerTool: SystemToolDefinition = {
  name: RESUME_TIMER_TOOL_NAME,

  description:
    "Riprende il timer in pausa se presente. " +
    "Usa questo tool quando l'utente chiede di riprendere, continuare o far ripartire il timer. " +
    "Esempi: 'riprendi il timer', 'continua il timer', 'fai ripartire il countdown', 'resume timer'. " +
    "Il timer continuerà dal punto in cui è stato messo in pausa.",

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

      if (!activeTimer.isPaused) {
        return {
          result: {
            success: false,
            error: "TIMER_NOT_PAUSED",
          },
        };
      }

      if (activeTimer.isExpired) {
        return {
          result: {
            success: false,
            error: "TIMER_EXPIRED",
          },
        };
      }

      timerManager.resumeTimer(activeTimer.id);

      return {
        result: {
          success: true,
        },
      };
    } catch (error) {
      console.error("[resumeTimerTool] Errore:", error);
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
