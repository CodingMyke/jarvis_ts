import { z } from "zod";
import { REEL_BOARD_STATUSES, REEL_GENERATION_STATUSES } from "./reel-board.constants";

const optionalNullableTextSchema = z.union([z.string().trim().min(1), z.null()]).optional();
const optionalNullableDateTimeSchema = z
  .union([z.string().datetime({ offset: true }), z.null()])
  .optional();

export const reelStatusSchema = z.enum(REEL_BOARD_STATUSES);
export const generationStatusSchema = z.enum(REEL_GENERATION_STATUSES);

export const reelSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  status: reelStatusSchema,
  generation_status: generationStatusSchema,
  idea: z.string().min(1),
  title: z.string().nullable(),
  caption: z.string().nullable(),
  body: z.string().nullable(),
  hashtags: z.string().nullable(),
  notes: z.string().nullable(),
  scheduled_at: z.string().nullable(),
  published_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const reelBoardSchema = z.object({
  columns: z.object({
    idea: z.array(reelSchema),
    script: z.array(reelSchema),
    to_record: z.array(reelSchema),
    to_edit: z.array(reelSchema),
    ready: z.array(reelSchema),
    published: z.array(reelSchema),
  }),
  count: z.number().int().nonnegative(),
});

export const createReelSchema = z.object({
  idea: z.string().trim().min(1),
});

export const updateReelSchema = z
  .object({
    idea: z.string().trim().min(1).optional(),
    title: optionalNullableTextSchema,
    caption: optionalNullableTextSchema,
    body: optionalNullableTextSchema,
    hashtags: z.union([z.string().trim().min(1), z.null()]).optional(),
    notes: optionalNullableTextSchema,
    scheduled_at: optionalNullableDateTimeSchema,
    published_at: optionalNullableDateTimeSchema,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const updateReelStatusSchema = z.object({
  status: reelStatusSchema,
});
