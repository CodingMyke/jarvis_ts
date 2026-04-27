import type { Json, Tables } from "@/app/_server/supabase/database.types";

export type ProgressionGoalStatus = "to_start" | "in_progress" | "completed" | "failed";
export type ProgressionFrequencyType = "daily" | "weekly_count" | "specific_weekdays";

export type ProgressionProfileRow = Tables<"progression_profiles">;
export type ProgressionGoalRow = Tables<"progression_goals">;
export type ProgressionActionRow = Tables<"progression_actions">;
export type ProgressionCheckinRow = Tables<"progression_checkins">;
export type ProgressionXpHistoryRow = Tables<"progression_xp_history">;

export interface ProgressionLevelProgress {
  level: number;
  totalXp: number;
  xpInCurrentLevel: number;
  xpRequiredForNextLevel: number;
  xpRemainingForNextLevel: number;
}

export interface DailyFrequencyConfig {}

export interface SpecificWeekdaysFrequencyConfig {
  weekdays: number[];
}

export interface WeeklyCountFrequencyConfig {
  targetCount: number;
}

export type ProgressionFrequencyConfig =
  | DailyFrequencyConfig
  | SpecificWeekdaysFrequencyConfig
  | WeeklyCountFrequencyConfig;

export type ProgressionFrequencyConfigJson = Json;
