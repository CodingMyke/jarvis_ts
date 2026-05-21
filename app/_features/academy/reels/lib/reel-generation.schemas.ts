import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const MIN_RUN_TIME_SPACING_MINUTES = 10;
const DEFAULT_IDEAS_PER_RUN = 3;
const DEFAULT_MAX_PENDING_AI_IDEAS = 10;
const DEFAULT_LATEST_PUBLISHED_REELS_COUNT = 3;

const optionalNullableTextSchema = z.union([z.string().trim().min(1), z.null()]).default(null);

const runTimesSchema = z
  .array(z.string().trim().regex(timeRegex, "Invalid time format"))
  .transform((times) => {
    const unique = Array.from(new Set(times));
    unique.sort();
    return unique;
  });

function hasValidRunTimeSpacing(runTimes: string[]): boolean {
  for (let index = 1; index < runTimes.length; index += 1) {
    const previous = runTimes[index - 1];
    const current = runTimes[index];

    if (!previous || !current) {
      continue;
    }

    const [previousHour, previousMinute] = previous.split(":").map(Number);
    const [currentHour, currentMinute] = current.split(":").map(Number);
    const previousTotalMinutes = previousHour * 60 + previousMinute;
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    if (currentTotalMinutes - previousTotalMinutes < MIN_RUN_TIME_SPACING_MINUTES) {
      return false;
    }
  }

  return true;
}

function validateFlowSettings(
  value: { enabled: boolean; runTimes: string[] },
  ctx: z.RefinementCtx,
): void {
  if (value.enabled && value.runTimes.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one run time is required when enabled",
      path: ["runTimes"],
    });
  }

  if (!hasValidRunTimeSpacing(value.runTimes)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Run times must be at least 10 minutes apart",
      path: ["runTimes"],
    });
  }
}

const reelScriptingSettingsBaseSchema = z.object({
  enabled: z.boolean(),
  runTimes: runTimesSchema.default([]),
  scriptingContext: optionalNullableTextSchema,
});

const reelIdeaGenerationSettingsBaseSchema = z.object({
  enabled: z.boolean(),
  runTimes: runTimesSchema.default([]),
  ideasPerRun: z.number().int().min(1).default(DEFAULT_IDEAS_PER_RUN),
  maxPendingAiIdeas: z.number().int().min(1).default(DEFAULT_MAX_PENDING_AI_IDEAS),
  latestPublishedReelsCount: z
    .number()
    .int()
    .min(1)
    .default(DEFAULT_LATEST_PUBLISHED_REELS_COUNT),
  ideaGenerationContext: optionalNullableTextSchema,
});

export const reelScriptingSettingsSchema =
  reelScriptingSettingsBaseSchema.superRefine(validateFlowSettings);

export const reelIdeaGenerationSettingsSchema =
  reelIdeaGenerationSettingsBaseSchema.superRefine(validateFlowSettings);

export const reelAutomationSettingsSchema = z.object({
  reelScripting: reelScriptingSettingsSchema.default({
    enabled: false,
    runTimes: [],
    scriptingContext: null,
  }),
  reelIdeaGeneration: reelIdeaGenerationSettingsSchema.default({
    enabled: false,
    runTimes: [],
    ideasPerRun: DEFAULT_IDEAS_PER_RUN,
    maxPendingAiIdeas: DEFAULT_MAX_PENDING_AI_IDEAS,
    latestPublishedReelsCount: DEFAULT_LATEST_PUBLISHED_REELS_COUNT,
    ideaGenerationContext: null,
  }),
});

export const reelAutomationSettingsPatchSchema = z
  .object({
    reelScripting: reelScriptingSettingsBaseSchema.partial().optional(),
    reelIdeaGeneration: reelIdeaGenerationSettingsBaseSchema.partial().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  })
  .superRefine((value, ctx) => {
    if (value.reelScripting) {
      validateFlowSettings(
        {
          enabled: value.reelScripting.enabled ?? false,
          runTimes: value.reelScripting.runTimes ?? [],
        },
        ctx,
      );
    }

    if (value.reelIdeaGeneration) {
      validateFlowSettings(
        {
          enabled: value.reelIdeaGeneration.enabled ?? false,
          runTimes: value.reelIdeaGeneration.runTimes ?? [],
        },
        ctx,
      );
    }
  });
