import type { SystemToolDefinition } from "../types";
import { timerManager } from "@/app/lib/timer";

export const PAUSE_TIMER_TOOL_NAME = "pauseTimer";

/**
 * Tool per mettere in pausa il timer attivo.
 * L'assistente può usarlo quando l'utente chiede di mettere in pausa il timer.
 */
export const pauseTimerTool: SystemToolDefinition = {
  name: PAUSE_TIMER_TOOL_NAME,

  description:
    "Mette in pausa il timer attivo se presente. " +
    "Usa questo tool quando l'utente chiede di mettere in pausa, sospendere o fermare temporaneamente il timer. " +
    "Esempi: 'metti in pausa il timer', 'sospendi il timer', 'ferma temporaneamente il countdown', 'pausa timer'. " +
    "Il timer può essere ripreso successivamente e continuerà dal punto in cui è stato messo in pausa.",

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

      if (activeTimer.isPaused) {
        return {
          result: {
            success: false,
            error: "TIMER_ALREADY_PAUSED",
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

      timerManager.pauseTimer(activeTimer.id);

      return {
        result: {
          success: true,
        },
      };
    } catch (error) {
      console.error("[pauseTimerTool] Errore:", error);
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
