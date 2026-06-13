import { z } from "zod";
import { REEL_GENERATION_TARGET_FIELDS } from "../lib/reel-generation.constants";

export const reelIdParamsSchema = z.object({
  reelId: z.string().uuid(),
});

export const reelFieldParamsSchema = z.object({
  field: z.enum(REEL_GENERATION_TARGET_FIELDS),
});

