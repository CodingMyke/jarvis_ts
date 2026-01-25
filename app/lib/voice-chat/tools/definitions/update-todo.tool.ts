import type { SystemToolDefinition } from "../types";
import { todoManager } from "@/app/lib/todo";

export const UPDATE_TODO_TOOL_NAME = "updateTodo";

/**
 * Tool per aggiornare un todo esistente.
 * L'assistente può usarlo quando l'utente chiede di modificare o completare un todo.
 */
export const updateTodoTool: SystemToolDefinition = {
  name: UPDATE_TODO_TOOL_NAME,

  description:
    "Aggiorna un todo esistente. Può essere usato per completare un todo, " +
    "marcarlo come fatto, modificare il testo, o riaprire un todo completato. " +
    "Usa questo tool quando l'utente chiede di completare un todo, di segnarlo come fatto, " +
    "di modificare un todo, o di riaprire un todo completato. " +
    "Esempi: 'completa il todo comprare il latte', 'segna come fatto chiamare Mario', " +
    "'modifica il todo spesa in fare la spesa', 'riapri il todo chiamare il dottore'.",

  parameters: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description:
          "L'ID del todo da aggiornare. Usa getTodos per ottenere gli ID dei todo disponibili.",
      },
      text: {
        type: "string",
        description:
          "Il nuovo testo del todo (opzionale). Usa questo solo se l'utente vuole modificare il testo.",
      },
      completed: {
        type: "boolean",
        description:
          "Se true, marca il todo come completato. Se false, lo marca come non completato. " +
          "Usa questo quando l'utente chiede di completare o riaprire un todo.",
      },
    },
    required: ["id"],
  },

  execute: async (args) => {
    try {
      const id = args.id as string;
      const text = args.text as string | undefined;
      const completed = args.completed as boolean | undefined;

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

      const updates: Partial<{ text: string; completed: boolean }> = {};
      if (text !== undefined) {
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
        updates.text = text.trim();
      }

      if (completed !== undefined) {
        if (typeof completed !== "boolean") {
          return {
            result: {
              success: false,
              error: "INVALID_COMPLETED",
              errorMessage: "Il campo completed deve essere un booleano",
            },
          };
        }
        updates.completed = completed;
      }

      if (Object.keys(updates).length === 0) {
        return {
          result: {
            success: false,
            error: "NO_UPDATES",
            errorMessage: "Nessun aggiornamento specificato",
          },
        };
      }

      const updatedTodo = todoManager.updateTodo(id, updates);

      if (!updatedTodo) {
        return {
          result: {
            success: false,
            error: "UPDATE_FAILED",
            errorMessage: "Impossibile aggiornare il todo",
          },
        };
      }

      return {
        result: {
          success: true,
          todo: {
            id: updatedTodo.id,
            text: updatedTodo.text,
            completed: updatedTodo.completed,
          },
        },
      };
    } catch (error) {
      console.error("[updateTodoTool] Errore:", error);
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
