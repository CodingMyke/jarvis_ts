import { z } from "zod";

export const userTimezoneSchema = z.string().trim().min(1).max(120);

export const userSettingsSchema = z.object({
  userId: z.string().trim().min(1),
  timezone: userTimezoneSchema,
});

export const userSettingsUpdateSchema = z.object({
  timezone: userTimezoneSchema,
});

export type UserSettings = z.infer<typeof userSettingsSchema>;
export type UserSettingsUpdate = z.infer<typeof userSettingsUpdateSchema>;
