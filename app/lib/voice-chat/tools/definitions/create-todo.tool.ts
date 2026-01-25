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

      // Verifica che sia fornito text o texts, ma non entrambi
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

      // Caso singolo todo
      if (text) {
        if (typeof text !== "string" || text.trim().length === 0) {
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
      }

      // Caso multipli todo
      if (texts) {
        if (!Array.isArray(texts) || texts.length === 0) {
          return {
            result: {
              success: false,
              error: "INVALID_TEXTS",
              errorMessage: "L'array 'texts' deve contenere almeno un elemento",
            },
          };
        }

        // Valida ogni testo
        const invalidTexts = texts.filter(
          (t) => typeof t !== "string" || t.trim().length === 0 || t.trim().length > 500
        );

        if (invalidTexts.length > 0) {
          return {
            result: {
              success: false,
              error: "INVALID_TEXTS",
              errorMessage:
                "Alcuni testi sono vuoti o troppo lunghi (max 500 caratteri). Tutti i testi devono essere validi.",
            },
          };
        }

        const createdTodos = todoManager.createTodos(texts);

        return {
          result: {
            success: true,
            todos: createdTodos.map((todo) => ({
              id: todo.id,
              text: todo.text,
              completed: todo.completed,
            })),
            count: createdTodos.length,
          },
        };
      }

      // Questo non dovrebbe mai essere raggiunto, ma TypeScript lo richiede
      return {
        result: {
          success: false,
          error: "UNEXPECTED_ERROR",
          errorMessage: "Errore imprevisto nell'esecuzione",
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
