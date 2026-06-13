import { z } from "zod";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const uuidSchema = z.string().trim().regex(UUID_REGEX, "Invalid UUID");
const dateOnlySchema = z.string().trim().regex(DATE_ONLY_REGEX, "Use YYYY-MM-DD");
const optionalDescriptionSchema = z.string().trim().max(2000).nullable().optional();
const optionalTitleSchema = z.string().trim().min(1).max(160).optional();
const nonNegativeXpSchema = z.coerce.number().int().min(0).max(100000);

const dailyFrequencyConfigSchema = z.object({}).passthrough();
const specificWeekdaysFrequencyConfigSchema = z.object({
  weekdays: z.array(z.number().int().min(1).max(7)).min(1).max(7),
});
const weeklyCountFrequencyConfigSchema = z.object({
  targetCount: z.number().int().min(1).max(7),
});

export const progressionOverviewQuerySchema = z.object({
  status: z
    .enum(["in_progress", "to_start", "completed", "failed", "all"])
    .optional(),
  today: dateOnlySchema.optional(),
});

export const progressionGoalDetailsQuerySchema = z.object({
  id: uuidSchema,
});

export const progressionGoalsQuerySchema = z.object({
  id: uuidSchema.optional(),
  status: z
    .enum(["in_progress", "to_start", "completed", "failed", "all"])
    .optional(),
});

export const progressionRecurringActionInputSchema = z.discriminatedUnion("frequencyType", [
  z.object({
    id: uuidSchema.optional(),
    title: z.string().trim().min(1).max(160),
    description: optionalDescriptionSchema,
    frequencyType: z.literal("daily"),
    frequencyConfig: dailyFrequencyConfigSchema.default({}),
    xpPerCheckin: nonNegativeXpSchema.default(0),
    active: z.boolean().optional(),
  }),
  z.object({
    id: uuidSchema.optional(),
    title: z.string().trim().min(1).max(160),
    description: optionalDescriptionSchema,
    frequencyType: z.literal("specific_weekdays"),
    frequencyConfig: specificWeekdaysFrequencyConfigSchema,
    xpPerCheckin: nonNegativeXpSchema.default(0),
    active: z.boolean().optional(),
  }),
  z.object({
    id: uuidSchema.optional(),
    title: z.string().trim().min(1).max(160),
    description: optionalDescriptionSchema,
    frequencyType: z.literal("weekly_count"),
    frequencyConfig: weeklyCountFrequencyConfigSchema,
    xpPerCheckin: nonNegativeXpSchema.default(0),
    active: z.boolean().optional(),
  }),
]);

export const progressionGoalCreateBodySchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: optionalDescriptionSchema,
  deadline: dateOnlySchema.nullable().optional(),
  completionXp: nonNegativeXpSchema.default(0),
  startNow: z.boolean().optional(),
  actions: z.array(progressionRecurringActionInputSchema).max(30).optional(),
});

export const progressionGoalUpdateBodySchema = z
  .object({
    id: uuidSchema,
    title: optionalTitleSchema,
    description: optionalDescriptionSchema,
    deadline: dateOnlySchema.nullable().optional(),
    completionXp: nonNegativeXpSchema.optional(),
    actions: z.array(progressionRecurringActionInputSchema).max(30).optional(),
    status: z.never().optional(),
  })
  .superRefine((value, ctx) => {
    const hasUpdate = [
      value.title,
      value.description,
      value.deadline,
      value.completionXp,
      value.actions,
    ].some((entry) => entry !== undefined);

    if (!hasUpdate) {
      ctx.addIssue({
        code: "custom",
        message: "No goal update specified",
      });
    }
  });

export const progressionGoalOperationBodySchema = z.object({
  goalId: uuidSchema,
  operation: z.enum(["start", "complete", "fail", "duplicate"]),
});

export const progressionGoalDeleteBodySchema = z.object({
  id: uuidSchema,
});

export const progressionCheckinCreateBodySchema = z.object({
  actionId: uuidSchema,
});

export const progressionCheckinUndoBodySchema = z.object({
  checkinId: uuidSchema,
});

export const progressionDeadlineReviewBodySchema = z
  .object({
    goalId: uuidSchema,
    action: z.enum(["complete", "fail", "postpone"]),
    newDeadline: dateOnlySchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === "postpone" && value.newDeadline === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "New deadline is required when postponing",
        path: ["newDeadline"],
      });
    }
  });

export const progressionXpHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});

export const progressionStatusResponseSchema = z.object({
  success: z.literal(true),
  status: z.enum(["OK", "WARNING"]),
});

export type ProgressionOverviewQuery = z.infer<typeof progressionOverviewQuerySchema>;
export type ProgressionGoalDetailsQuery = z.infer<typeof progressionGoalDetailsQuerySchema>;
export type ProgressionGoalsQuery = z.infer<typeof progressionGoalsQuerySchema>;
export type ProgressionGoalCreateBody = z.infer<typeof progressionGoalCreateBodySchema>;
export type ProgressionGoalUpdateBody = z.infer<typeof progressionGoalUpdateBodySchema>;
export type ProgressionGoalOperationBody = z.infer<typeof progressionGoalOperationBodySchema>;
export type ProgressionGoalDeleteBody = z.infer<typeof progressionGoalDeleteBodySchema>;
export type ProgressionCheckinCreateBody = z.infer<typeof progressionCheckinCreateBodySchema>;
export type ProgressionCheckinUndoBody = z.infer<typeof progressionCheckinUndoBodySchema>;
export type ProgressionDeadlineReviewBody = z.infer<typeof progressionDeadlineReviewBodySchema>;
export type ProgressionXpHistoryQuery = z.infer<typeof progressionXpHistoryQuerySchema>;
export type ProgressionStatusResponse = z.infer<typeof progressionStatusResponseSchema>;

export type ProgressionGoalCreateInput = z.input<typeof progressionGoalCreateBodySchema>;
export type ProgressionGoalUpdateInput = z.input<typeof progressionGoalUpdateBodySchema>;
export type ProgressionGoalOperationInput = z.input<typeof progressionGoalOperationBodySchema>;
export type ProgressionDeadlineReviewInput = z.input<typeof progressionDeadlineReviewBodySchema>;
