import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const runTimesSchema = z
  .array(z.string().trim().regex(timeRegex, "Invalid time format"))
  .transform((times) => {
    const unique = Array.from(new Set(times));
    unique.sort();
    return unique;
  });

const reelAutomationSettingsBaseSchema = z.object({
  enabled: z.boolean(),
  runTimes: runTimesSchema.default([]),
  editorialContext: z.union([z.string().trim().min(1), z.null()]).default(null),
});

export const reelAutomationSettingsSchema = reelAutomationSettingsBaseSchema.superRefine((value, ctx) => {
  if (value.enabled && value.runTimes.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one run time is required when enabled",
      path: ["runTimes"],
    });
  }
});

export const reelAutomationSettingsPatchSchema = reelAutomationSettingsBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required" })
  .superRefine((value, ctx) => {
    if (value.enabled === true && (value.runTimes?.length ?? 0) === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one run time is required when enabled",
        path: ["runTimes"],
      });
    }
  });
