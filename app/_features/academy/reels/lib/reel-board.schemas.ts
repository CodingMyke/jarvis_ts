import { z } from "zod";
import {
  REEL_BOARD_STATUSES,
  REEL_GENERATION_STATUSES,
  REEL_ORIGINS,
} from "./reel-board.constants";

const optionalNullableTextSchema = z.union([z.string().trim().min(1), z.null()]).optional();
const optionalNullableDateTimeSchema = z
  .union([z.string().datetime({ offset: true }), z.null()])
  .optional();

export const reelStatusSchema = z.enum(REEL_BOARD_STATUSES);
export const generationStatusSchema = z.enum(REEL_GENERATION_STATUSES);
export const reelOriginSchema = z.enum(REEL_ORIGINS);

export const reelSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid().optional(),
    status: reelStatusSchema,
    origin: reelOriginSchema.optional(),
    last_idea_generation_run_id: z.string().uuid().nullable().optional(),
    generation_status: generationStatusSchema.optional(),
    idea: z.string().min(1),
    title: z.string().nullable().optional(),
    caption: z.string().nullable().optional(),
    body: z.string().nullable().optional(),
    hashtags: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    scheduled_at: z.string().nullable().optional(),
    published_at: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string().optional(),
  })
  .transform((reel) => ({
    ...reel,
    origin: reel.origin ?? "manual",
    last_idea_generation_run_id: reel.last_idea_generation_run_id ?? null,
    generation_status: reel.generation_status ?? "not_generated",
    title: reel.title ?? null,
    caption: reel.caption ?? null,
    body: reel.body ?? null,
    hashtags: reel.hashtags ?? null,
    notes: reel.notes ?? null,
    scheduled_at: reel.scheduled_at ?? null,
    published_at: reel.published_at ?? null,
    updated_at: reel.updated_at ?? reel.created_at,
  }));

export const reelBoardSchema = z.object({
  columns: z.object({
    ai_idea: z.array(reelSchema),
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
