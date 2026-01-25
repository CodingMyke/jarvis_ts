import type { SystemToolDefinition } from "../types";
import { todoManager } from "@/app/lib/todo";

export const CREATE_TODO_TOOL_NAME = "createTodo";

/**
 * Tool per creare un nuovo todo.
 * L'assistente può usarlo quando l'utente chiede di aggiungere qualcosa da fare.
 */
export const createTodoTool: SystemToolDefinition = {
  name: CREATE_TODO_TOOL_NAME,

  description:
    "Crea un nuovo todo (cosa da fare). " +
    "Usa questo tool quando l'utente chiede di aggiungere qualcosa alla lista delle cose da fare, " +
    "di segnarsi qualcosa, di ricordarsi qualcosa, o di aggiungere un promemoria. " +
    "Esempi: 'aggiungi comprare il latte', 'segna che devo chiamare Mario', " +
    "'ricordami di fare la spesa', 'aggiungi un todo per domani'.",

  parameters: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description:
          "Il testo del todo da creare. Deve essere chiaro e descrittivo. " +
          "Esempi: 'Comprare il latte', 'Chiamare il dottore', 'Fare la spesa'.",
      },
    },
    required: ["text"],
  },

  execute: async (args) => {
    try {
      const text = args.text as string;

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return {
          result: {
            success: false,
            error: "INVALID_TEXT",
            errorMessage: "Il testo del todo non può essere vuoto",
          },
        };
      }

      if (text.trim().length > 500) {
        return {
          result: {
            success: false,
            error: "TEXT_TOO_LONG",
            errorMessage: "Il testo del todo non può superare i 500 caratteri",
          },
        };
      }

      const todo = todoManager.createTodo(text);

      return {
        result: {
          success: true,
          todo: {
            id: todo.id,
            text: todo.text,
            completed: todo.completed,
          },
        },
      };
    } catch (error) {
      console.error("[createTodoTool] Errore:", error);
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
