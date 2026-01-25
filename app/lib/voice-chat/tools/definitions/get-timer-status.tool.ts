import type { SystemToolDefinition } from "../types";
import { timerManager } from "@/app/lib/timer";

export const GET_TIMER_STATUS_TOOL_NAME = "getTimerStatus";

/**
 * Formatta i secondi in formato leggibile.
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? "secondo" : "secondi"}`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes} ${minutes === 1 ? "minuto" : "minuti"}`;
  }

  return `${minutes} ${minutes === 1 ? "minuto" : "minuti"} e ${remainingSeconds} ${remainingSeconds === 1 ? "secondo" : "secondi"}`;
}

/**
 * Tool per ottenere lo stato del timer attivo.
 * L'assistente può usarlo quando l'utente chiede quanto tempo manca al timer.
 */
export const getTimerStatusTool: SystemToolDefinition = {
  name: GET_TIMER_STATUS_TOOL_NAME,

  description:
    "Ottiene lo stato del timer attivo, incluso il tempo rimanente. " +
    "Usa questo tool quando l'utente chiede quanto tempo manca al timer, " +
    "quando scade il timer, o lo stato del countdown. " +
    "Esempi: 'quanto tempo manca?', 'quando scade il timer?', 'quanto è rimasto?', " +
    "'stato del timer', 'tempo rimanente'.",

  execute: async () => {
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

      const remainingFormatted = formatDuration(activeTimer.remainingSeconds);
      const totalFormatted = formatDuration(activeTimer.durationSeconds);

      return {
        result: {
          success: true,
          timerId: activeTimer.id,
          remainingSeconds: activeTimer.remainingSeconds,
          remainingFormatted,
          totalSeconds: activeTimer.durationSeconds,
          totalFormatted,
          isActive: activeTimer.isActive,
          isExpired: activeTimer.isExpired,
        },
      };
    } catch (error) {
      console.error("[getTimerStatusTool] Errore:", error);
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
