import type { SystemToolDefinition } from "../types";
import { todoManager } from "@/app/lib/todo";

export const DELETE_TODO_TOOL_NAME = "deleteTodo";

/**
 * Tool per eliminare un todo.
 * L'assistente può usarlo quando l'utente chiede di rimuovere un todo dalla lista.
 */
export const deleteTodoTool: SystemToolDefinition = {
  name: DELETE_TODO_TOOL_NAME,

  description:
    "Elimina uno o più todo dalla lista, oppure elimina tutti i todo. " +
    "Usa questo tool quando l'utente chiede di rimuovere un todo, di cancellarlo, " +
    "di eliminarlo dalla lista, o di toglierlo dalle cose da fare. " +
    "Puoi eliminare un singolo todo usando 'id', più todo usando 'ids', o tutti i todo usando 'deleteAll: true'. " +
    "Esempi: 'elimina il todo comprare il latte', 'rimuovi chiamare Mario', " +
    "'cancella il todo spesa', 'elimina tutti i todo', 'cancella tutto'.",

  parameters: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description:
          "L'ID di un singolo todo da eliminare. Usa questo per eliminare un solo todo. " +
          "Usa getTodos per ottenere gli ID dei todo disponibili. " +
          "Non usare insieme a 'ids' o 'deleteAll'.",
      },
      ids: {
        type: "array",
        items: {
          type: "string",
        },
        description:
          "Array di ID per eliminare più todo in una singola operazione. " +
          "Usa questo quando l'utente chiede di eliminare più todo alla volta. " +
          "Non usare insieme a 'id' o 'deleteAll'.",
      },
      deleteAll: {
        type: "boolean",
        description:
          "Se true, elimina tutti i todo dalla lista. " +
          "Usa questo quando l'utente chiede di eliminare tutti i todo, cancellare tutto, o svuotare la lista. " +
          "Non usare insieme a 'id' o 'ids'.",
      },
    },
  },

  execute: async (args) => {
    try {
      const id = args.id as string | undefined;
      const ids = args.ids as string[] | undefined;
      const deleteAll = args.deleteAll as boolean | undefined;

      // Verifica che sia fornito almeno un parametro
      if (!id && !ids && deleteAll !== true) {
        return {
          result: {
            success: false,
            error: "MISSING_PARAMETER",
            errorMessage: "È necessario fornire 'id', 'ids' o 'deleteAll: true'",
          },
        };
      }

      // Verifica che non siano forniti più parametri contemporaneamente
      const paramCount = [id, ids, deleteAll === true].filter(Boolean).length;
      if (paramCount > 1) {
        return {
          result: {
            success: false,
            error: "INVALID_PARAMETERS",
            errorMessage: "Non è possibile usare 'id', 'ids' e 'deleteAll' insieme",
          },
        };
      }

      // Caso: elimina tutti i todo
      if (deleteAll === true) {
        const deletedCount = todoManager.deleteAllTodos();

        return {
          result: {
            success: true,
            deletedAll: true,
            count: deletedCount,
          },
        };
      }

      // Caso: elimina singolo todo
      if (id) {
        if (typeof id !== "string") {
          return {
            result: {
              success: false,
              error: "INVALID_ID",
              errorMessage: "L'ID del todo deve essere una stringa",
            },
          };
        }

        const existingTodo = todoManager.getTodoById(id);
        if (!existingTodo) {
          return {
            result: {
              success: false,
              error: "TODO_NOT_FOUND",
              errorMessage: `Todo con ID ${id} non trovato`,
            },
          };
        }

        const deleted = todoManager.deleteTodo(id);

        if (!deleted) {
          return {
            result: {
              success: false,
              error: "DELETE_FAILED",
              errorMessage: "Impossibile eliminare il todo",
            },
          };
        }

        return {
          result: {
            success: true,
            deletedTodo: {
              id: existingTodo.id,
              text: existingTodo.text,
            },
          },
        };
      }

      // Caso: elimina più todo
      if (ids) {
        if (!Array.isArray(ids) || ids.length === 0) {
          return {
            result: {
              success: false,
              error: "INVALID_IDS",
              errorMessage: "L'array 'ids' deve contenere almeno un elemento",
            },
          };
        }

        // Verifica che tutti gli ID siano stringhe valide
        const invalidIds = ids.filter((i) => typeof i !== "string" || i.trim().length === 0);
        if (invalidIds.length > 0) {
          return {
            result: {
              success: false,
              error: "INVALID_IDS",
              errorMessage: "Tutti gli ID devono essere stringhe non vuote",
            },
          };
        }

        // Recupera i todo prima di eliminarli per il risultato
        const todosToDelete = ids
          .map((todoId) => {
            const todo = todoManager.getTodoById(todoId);
            return todo ? { id: todo.id, text: todo.text } : null;
          })
          .filter((todo): todo is { id: string; text: string } => todo !== null);

        const deletedCount = todoManager.deleteTodos(ids);

        if (deletedCount === 0) {
          return {
            result: {
              success: false,
              error: "NO_TODOS_DELETED",
              errorMessage: "Nessun todo è stato eliminato. Verifica che gli ID siano corretti.",
            },
          };
        }

        return {
          result: {
            success: true,
            deletedTodos: todosToDelete,
            count: deletedCount,
            requestedCount: ids.length,
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
      console.error("[deleteTodoTool] Errore:", error);
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
