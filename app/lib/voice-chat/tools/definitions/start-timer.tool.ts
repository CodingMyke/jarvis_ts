import type { SystemToolDefinition } from "../types";
import { timerManager } from "@/app/lib/timer";

export const START_TIMER_TOOL_NAME = "startTimer";

/**
 * Converte una durata in formato leggibile (es. "5 minuti", "30 secondi") in secondi.
 */
function parseDuration(duration: string | number): number {
  if (typeof duration === "number") {
    return duration;
  }

  // Rimuovi spazi e converti in minuscolo
  const normalized = duration.toLowerCase().trim();

  // Cerca pattern come "5 minuti", "5m", "30 secondi", "30s", ecc.
  const minuteMatch = normalized.match(/(\d+)\s*(minuti?|m|min)/);
  if (minuteMatch) {
    return parseInt(minuteMatch[1], 10) * 60;
  }

  const secondMatch = normalized.match(/(\d+)\s*(secondi?|s|sec)/);
  if (secondMatch) {
    return parseInt(secondMatch[1], 10);
  }

  // Se è solo un numero, assumi secondi
  const numberMatch = normalized.match(/(\d+)/);
  if (numberMatch) {
    return parseInt(numberMatch[1], 10);
  }

  throw new Error(`Durata non valida: ${duration}`);
}

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
 * Tool per avviare un timer.
 * L'assistente può usarlo quando l'utente chiede di impostare un timer.
 */
export const startTimerTool: SystemToolDefinition = {
  name: START_TIMER_TOOL_NAME,

  description:
    "Avvia un timer con la durata specificata. " +
    "Usa questo tool quando l'utente chiede di impostare un timer, " +
    "un countdown o un promemoria temporale. " +
    "Esempi: 'imposta un timer di 5 minuti', 'fai partire un timer di 30 secondi', " +
    "'timer di 10 minuti', 'avvia un countdown di 2 minuti'. " +
    "Il timer verrà mostrato in alto a destra e suonerà quando finisce.",

  parameters: {
    type: "object",
    properties: {
      duration: {
        type: "string",
        description:
          "Durata del timer. Può essere un numero (in secondi) o una stringa " +
          "come '5 minuti', '30 secondi', '10m', '45s'. " +
          "Esempi: '300' (300 secondi), '5 minuti', '30 secondi', '10m', '45s'. " +
          "Se non specificato, usa 5 minuti come default.",
      },
    },
    required: [],
  },

  execute: async (args) => {
    try {
      let durationSeconds: number;

      if (args.duration) {
        // Gemini invierà sempre una stringa, quindi convertiamo
        const durationValue = args.duration as string;
        durationSeconds = parseDuration(durationValue);
      } else {
        // Default: 5 minuti
        durationSeconds = 5 * 60;
      }

      // Validazione: minimo 1 secondo, massimo 24 ore
      if (durationSeconds < 1) {
        return {
          result: {
            success: false,
            error: "INVALID_DURATION",
            minSeconds: 1,
          },
        };
      }

      if (durationSeconds > 24 * 60 * 60) {
        return {
          result: {
            success: false,
            error: "DURATION_TOO_LONG",
            maxSeconds: 24 * 60 * 60,
          },
        };
      }

      const timerId = timerManager.startTimer(durationSeconds);
      const formattedDuration = formatDuration(durationSeconds);

      return {
        result: {
          success: true,
          timerId,
          durationSeconds,
          formattedDuration,
        },
      };
    } catch (error) {
      console.error("[startTimerTool] Errore:", error);
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
