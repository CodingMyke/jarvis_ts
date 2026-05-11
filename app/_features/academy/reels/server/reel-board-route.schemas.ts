import { z } from "zod";
import {
  createReelSchema,
  updateReelSchema,
  updateReelStatusSchema,
} from "../lib/reel-board.schemas";

export const reelIdParamsSchema = z.object({
  reelId: z.string().uuid(),
});

export const reelCreateBodySchema = createReelSchema;
export const reelUpdateBodySchema = updateReelSchema;
export const reelUpdateStatusBodySchema = updateReelStatusSchema;
