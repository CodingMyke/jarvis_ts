import type { SystemToolDefinition } from "../types";
import { notifyTodosChanged } from "@/app/lib/tasks";

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

        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text.trim() }),
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          return {
            result: {
              success: false,
              error: data.error || "CREATION_FAILED",
              errorMessage: data.errorMessage || data.message || "Errore durante la creazione",
            },
          };
        }

        const todo = data.todo ?? {};
        notifyTodosChanged();
        return {
          result: {
            success: true,
            todo: {
              id: todo.id,
              text: todo.text,
              completed: todo.completed ?? false,
            },
          },
        };
      }

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

        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: texts.map((t) => String(t).trim()) }),
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          return {
            result: {
              success: false,
              error: data.error || "CREATION_FAILED",
              errorMessage: data.errorMessage || data.message || "Errore durante la creazione",
            },
          };
        }

        const todos = (data.todos || []).map(
          (t: { id: string; text: string; completed: boolean }) => ({
            id: t.id,
            text: t.text,
            completed: t.completed ?? false,
          })
        );
        notifyTodosChanged();
        return {
          result: {
            success: true,
            todos,
            count: todos.length,
          },
        };
      }

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
