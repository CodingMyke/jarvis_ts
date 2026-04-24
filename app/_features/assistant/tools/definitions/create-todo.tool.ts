import { createTodos } from "@/app/_features/tasks/lib/tasks-client";
import type { SystemToolDefinition } from "../types";

export const CREATE_TODO_TOOL_NAME = "createTodo";

/**
 * Tool per creare uno o più todo (task Google).
 * Chiama l'API /api/tasks.
 */
export const createTodoTool: SystemToolDefinition = {
  name: CREATE_TODO_TOOL_NAME,

  description:
    "Crea uno o più todo (cose da fare). " +
    "Usa questo tool quando l'utente chiede di aggiungere qualcosa alla lista delle cose da fare, " +
    "di segnarsi qualcosa, di ricordarsi qualcosa, o di aggiungere un promemoria. " +
    "Puoi creare un singolo todo usando 'text' o più todo usando 'texts'. " +
    "Esempi: 'aggiungi comprare il latte', 'segna che devo chiamare Mario', " +
    "'ricordami di fare la spesa', 'aggiungi comprare latte, pane e uova' (più todo).",

  parameters: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description:
          "Il testo di un singolo todo da creare. Usa questo per creare un solo todo. " +
          "Esempi: 'Comprare il latte', 'Chiamare il dottore', 'Fare la spesa'. " +
          "Non usare insieme a 'texts'.",
      },
      texts: {
        type: "array",
        items: {
          type: "string",
        },
        description:
          "Array di testi per creare più todo in una singola operazione. " +
          "Usa questo quando l'utente chiede di aggiungere più cose alla volta. " +
          "Esempio: ['Comprare il latte', 'Chiamare il dottore', 'Fare la spesa']. " +
          "Non usare insieme a 'text'.",
      },
    },
  },

  execute: async (args) => {
    try {
      const text = args.text as string | undefined;
      const texts = args.texts as string[] | undefined;

      if (!text && !texts) {
        return {
          result: {
            success: false,
            error: "MISSING_PARAMETER",
            errorMessage: "È necessario fornire 'text' o 'texts'",
          },
        };
      }

      if (text && texts) {
        return {
          result: {
            success: false,
            error: "INVALID_PARAMETERS",
            errorMessage: "Non è possibile usare 'text' e 'texts' insieme",
          },
        };
      }

      const result = text
        ? await createTodos({ text })
        : await createTodos({ texts: texts as string[] });

      return {
        result,
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
