import { deleteTodos } from "@/app/_features/tasks/lib/tasks-client";
import type { SystemToolDefinition } from "../types";

export const DELETE_TODO_TOOL_NAME = "deleteTodo";

/**
 * Tool per eliminare uno o più todo (task Google).
 * Chiama l'API /api/tasks.
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
        items: { type: "string" },
        description:
          "Array di ID per eliminare più todo in una singola operazione. " +
          "Usa questo quando l'utente chiede di eliminare più todo alla volta. " +
          "Non usare insieme a 'id' o 'deleteAll'.",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
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

      if (deleteAll === true) {
        return {
          result: await deleteTodos({ deleteAll: true }),
        };
      }

      if (id) {
        return {
          result: await deleteTodos({ id }),
        };
      }

      if (ids) {
        return {
          result: await deleteTodos({ ids }),
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
