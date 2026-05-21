import { z } from "zod";
import {
  createReelSchema,
  reelOriginSchema,
  updateReelSchema,
  updateReelStatusSchema,
} from "../lib/reel-board.schemas";

export const reelIdParamsSchema = z.object({
  reelId: z.string().uuid(),
});

export const reelCreateBodySchema = createReelSchema;
export const reelUpdateBodySchema = updateReelSchema.and(
  z.object({
    origin: reelOriginSchema.optional(),
  }),
);
export const reelApproveBodySchema = updateReelSchema.and(
  z.object({
    idea: z.string().trim().min(1),
  }),
);
export const reelUpdateStatusBodySchema = updateReelStatusSchema;
