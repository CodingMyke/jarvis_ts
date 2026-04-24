import { updateTodos } from "@/app/_features/tasks/lib/tasks-client";
import type { SystemToolDefinition } from "../types";

export const UPDATE_TODO_TOOL_NAME = "updateTodo";

/**
 * Tool per aggiornare uno o più todo (task Google).
 * Chiama l'API /api/tasks.
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

      if (id) {
        return {
          result: await updateTodos({ id, text, completed }),
        };
      }

      if (updates) {
        return {
          result: await updateTodos({ updates }),
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
