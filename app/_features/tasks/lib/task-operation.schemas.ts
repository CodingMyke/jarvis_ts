import { z } from "zod";

export const todoIdSchema = z.string().trim().min(1, "L'id è obbligatorio");

export const todoTextSchema = z
  .string()
  .trim()
  .min(1, "Il testo non può essere vuoto")
  .max(500, "Il testo non può superare i 500 caratteri");

const todoUpdateSchema = z
  .object({
    id: todoIdSchema,
    text: todoTextSchema.optional(),
    completed: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.text === undefined && value.completed === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Nessun aggiornamento specificato",
      });
    }
  });

export const taskCreateBodySchema = z.union([
  z.object({
    text: todoTextSchema,
    texts: z.undefined().optional(),
  }),
  z.object({
    text: z.undefined().optional(),
    texts: z.array(todoTextSchema).min(1, "Nessun testo valido"),
  }),
]);

export const taskUpdateBodySchema = z.union([
  todoUpdateSchema,
  z.object({
    updates: z.array(todoUpdateSchema).min(1, "Fornire almeno un aggiornamento"),
  }),
]);

export const taskDeleteBodySchema = z
  .object({
    id: todoIdSchema.optional(),
    ids: z.array(todoIdSchema).min(1).optional(),
    deleteAll: z.boolean().optional(),
    deleteCompleted: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const actions = [
      value.id !== undefined,
      value.ids !== undefined,
      value.deleteAll === true,
      value.deleteCompleted === true,
    ].filter(Boolean).length;

    if (actions !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "Fornire una sola azione tra id, ids, deleteAll o deleteCompleted",
      });
    }
  });

export type TaskCreateBody = z.infer<typeof taskCreateBodySchema>;
export type TaskUpdateBody = z.infer<typeof taskUpdateBodySchema>;
export type TaskDeleteBody = z.infer<typeof taskDeleteBodySchema>;

export function getTaskSchemaErrorMessage(error: z.ZodError, fallback: string): string {
  const [issue] = error.issues;

  if (!issue) {
    return fallback;
  }

  const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`;
}
