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
    "Aggiorna uno o più todo esistenti. Può essere usato per completare todo, " +
    "marcarli come fatti, modificare il testo, o riaprire todo completati. " +
    "Usa questo tool quando l'utente chiede di completare todo, di segnarli come fatti, " +
    "di modificare todo, o di riaprire todo completati. " +
    "Puoi aggiornare un singolo todo usando 'id' con 'text' o 'completed', " +
    "oppure aggiornare più todo usando 'updates' con un array di aggiornamenti. " +
    "Esempi: 'completa il todo comprare il latte', 'segna come fatto chiamare Mario', " +
    "'modifica il todo spesa in fare la spesa', 'completa tutti i todo della spesa' (più todo).",

  parameters: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description:
          "L'ID di un singolo todo da aggiornare. Usa questo per aggiornare un solo todo. " +
          "Usa getTodos per ottenere gli ID dei todo disponibili. " +
          "Non usare insieme a 'updates'.",
      },
      text: {
        type: "string",
        description:
          "Il nuovo testo del todo (opzionale, solo per singolo update). " +
          "Usa questo solo se l'utente vuole modificare il testo di un singolo todo.",
      },
      completed: {
        type: "boolean",
        description:
          "Se true, marca il todo come completato. Se false, lo marca come non completato. " +
          "Usa questo quando l'utente chiede di completare o riaprire un singolo todo. " +
          "Solo per singolo update.",
      },
      updates: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "L'ID del todo da aggiornare.",
            },
            text: {
              type: "string",
              description: "Il nuovo testo del todo (opzionale).",
            },
            completed: {
              type: "boolean",
              description:
                "Se true, marca il todo come completato. Se false, lo marca come non completato.",
            },
          },
          required: ["id"],
        },
        description:
          "Array di aggiornamenti per modificare più todo in una singola operazione. " +
          "Ogni elemento deve avere almeno 'id' e opzionalmente 'text' o 'completed'. " +
          "Usa questo quando l'utente chiede di aggiornare più todo alla volta. " +
          "Non usare insieme a 'id', 'text' o 'completed'.",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    },
  },

  execute: async (args) => {
    try {
      const id = args.id as string | undefined;
      const text = args.text as string | undefined;
      const completed = args.completed as boolean | undefined;
      const updates = args.updates as
        | Array<{ id: string; text?: string; completed?: boolean }>
        | undefined;

      // Verifica che sia fornito id o updates, ma non entrambi
      if (!id && !updates) {
        return {
          result: {
            success: false,
            error: "MISSING_PARAMETER",
            errorMessage: "È necessario fornire 'id' o 'updates'",
          },
        };
      }

      if (id && updates) {
        return {
          result: {
            success: false,
            error: "INVALID_PARAMETERS",
            errorMessage: "Non è possibile usare 'id' e 'updates' insieme",
          },
        };
      }

      // Caso singolo update
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

        const updateData: Partial<{ text: string; completed: boolean }> = {};
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
          updateData.text = text.trim();
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
          updateData.completed = completed;
        }

        if (Object.keys(updateData).length === 0) {
          return {
            result: {
              success: false,
              error: "NO_UPDATES",
              errorMessage: "Nessun aggiornamento specificato",
            },
          };
        }

        const updatedTodo = todoManager.updateTodo(id, updateData);

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
      }

      // Caso multipli update
      if (updates) {
        if (!Array.isArray(updates) || updates.length === 0) {
          return {
            result: {
              success: false,
              error: "INVALID_UPDATES",
              errorMessage: "L'array 'updates' deve contenere almeno un elemento",
            },
          };
        }

        // Valida ogni update
        const validatedUpdates: Array<{
          id: string;
          updates: Partial<{ text: string; completed: boolean }>;
        }> = [];

        for (const update of updates) {
          if (!update.id || typeof update.id !== "string") {
            return {
              result: {
                success: false,
                error: "INVALID_UPDATE",
                errorMessage: "Ogni update deve avere un 'id' valido (stringa)",
              },
            };
          }

          const updateData: Partial<{ text: string; completed: boolean }> = {};

          if (update.text !== undefined) {
            if (typeof update.text !== "string" || update.text.trim().length === 0) {
              return {
                result: {
                  success: false,
                  error: "INVALID_TEXT",
                  errorMessage: `Il testo del todo con ID ${update.id} non può essere vuoto`,
                },
              };
            }
            if (update.text.trim().length > 500) {
              return {
                result: {
                  success: false,
                  error: "TEXT_TOO_LONG",
                  errorMessage: `Il testo del todo con ID ${update.id} non può superare i 500 caratteri`,
                },
              };
            }
            updateData.text = update.text.trim();
          }

          if (update.completed !== undefined) {
            if (typeof update.completed !== "boolean") {
              return {
                result: {
                  success: false,
                  error: "INVALID_COMPLETED",
                  errorMessage: `Il campo completed per il todo con ID ${update.id} deve essere un booleano`,
                },
              };
            }
            updateData.completed = update.completed;
          }

          if (Object.keys(updateData).length === 0) {
            return {
              result: {
                success: false,
                error: "NO_UPDATES",
                errorMessage: `Nessun aggiornamento specificato per il todo con ID ${update.id}`,
              },
            };
          }

          validatedUpdates.push({
            id: update.id,
            updates: updateData,
          });
        }

        const results = todoManager.updateTodos(validatedUpdates);

        const successfulUpdates = results
          .filter((r) => r.todo !== null)
          .map((r) => ({
            id: r.id,
            text: r.todo!.text,
            completed: r.todo!.completed,
          }));

        const failedIds = results.filter((r) => r.todo === null).map((r) => r.id);

        return {
          result: {
            success: true,
            todos: successfulUpdates,
            count: successfulUpdates.length,
            failedIds: failedIds.length > 0 ? failedIds : undefined,
            requestedCount: updates.length,
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
