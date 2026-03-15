import { getTodos } from "@/app/_features/tasks/lib/tasks-client";
import type { SystemToolDefinition } from "../types";

export const GET_TODOS_TOOL_NAME = "getTodos";

/**
 * Tool per ottenere tutti i todo (task Google).
 * Chiama l'API /api/tasks che legge dalla lista Google Tasks di default.
 */
export const getTodosTool: SystemToolDefinition = {
  name: GET_TODOS_TOOL_NAME,

  description:
    "Ottiene tutti i todo (cose da fare) presenti nella lista. " +
    "Usa questo tool quando l'utente chiede di vedere la lista delle cose da fare, " +
    "di elencare i todo, di vedere cosa c'è da fare, o di controllare i promemoria. " +
    "Esempi: 'mostrami i todo', 'cosa c'è da fare?', 'elencami le cose da fare', " +
    "'quali sono i miei todo?'. " +
    "IMPORTANTE: Quando elenchi i todo a voce, leggi ogni todo in modo fluido e naturale, " +
    "separandoli con pause brevi. NON usare formattazione Markdown (no trattini, asterischi, numeri con punto). " +
    "Esempio: 'Hai tre cose da fare: comprare il latte, chiamare il dottore e fare la spesa' " +
    "invece di '- Comprare il latte\n- Chiamare il dottore\n- Fare la spesa'.",

  execute: async () => {
    try {
      const result = await getTodos();

      return {
        result,
      };
    } catch (error) {
      console.error("[getTodosTool] Errore:", error);
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
