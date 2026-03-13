import { z } from "zod";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const conversationPartSchema = z.object({
  text: z.string(),
});

const conversationTurnSchema = z.object({
  role: z.enum(["user", "model"]),
  parts: z.array(conversationPartSchema),
  thinking: z.string().optional(),
});

export const chatsQuerySchema = z
  .object({
    id: z.string().trim().regex(UUID_REGEX, "ID chat non valido").optional(),
    search: z.string().trim().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(20).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.id && value.search) {
      ctx.addIssue({
        code: "custom",
        message: "Usa id o search, non entrambi",
      });
    }
  });

export const chatsCreateBodySchema = z.object({
  title: z.string().trim().min(1).max(255).nullable().optional(),
  turns: z.array(conversationTurnSchema).optional(),
});

export const chatsAppendBodySchema = z.object({
  id: z.string().trim().regex(UUID_REGEX, "ID chat non valido"),
  turns: z.array(conversationTurnSchema),
});

export const chatsDeleteBodySchema = z.object({
  id: z.string().trim().regex(UUID_REGEX, "ID chat non valido"),
});
