import { z } from "zod";

const todoTextSchema = z
  .string()
  .trim()
  .min(1, "Il testo non può essere vuoto")
  .max(500, "Il testo non può superare i 500 caratteri");

const todoUpdateSchema = z
  .object({
    id: z.string().trim().min(1, "L'id è obbligatorio"),
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
    id: z.string().trim().min(1).optional(),
    ids: z.array(z.string().trim().min(1)).min(1).optional(),
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
