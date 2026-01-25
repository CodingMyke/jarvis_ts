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
    "Elimina un todo dalla lista. " +
    "Usa questo tool quando l'utente chiede di rimuovere un todo, di cancellarlo, " +
    "di eliminarlo dalla lista, o di toglierlo dalle cose da fare. " +
    "Esempi: 'elimina il todo comprare il latte', 'rimuovi chiamare Mario', " +
    "'cancella il todo spesa', 'togli dalla lista fare la spesa'.",

  parameters: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description:
          "L'ID del todo da eliminare. Usa getTodos per ottenere gli ID dei todo disponibili.",
      },
    },
    required: ["id"],
  },

  execute: async (args) => {
    try {
      const id = args.id as string;

      if (!id || typeof id !== "string") {
        return {
          result: {
            success: false,
            error: "INVALID_ID",
            errorMessage: "L'ID del todo è obbligatorio",
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
