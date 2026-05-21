import type { Json } from "@/app/_server/supabase/database.types";
import type {
  DailyFrequencyConfig,
  ProgressionFrequencyType,
  SpecificWeekdaysFrequencyConfig,
  WeeklyCountFrequencyConfig,
} from "./progression.types";

export interface ProgressionFrequencyAction {
  id: string;
  frequencyType: ProgressionFrequencyType;
  frequencyConfig: Json;
  active: boolean;
}

export interface ProgressionTodayContext {
  todayLocalDate: string;
  isoWeekday: number;
  weekStart: string;
  weekEnd: string;
}

export interface ProgressionCheckinSummary {
  actionId: string;
  localDate: string;
}

function isRecord(value: Json): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePositiveInteger(value: Json, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}

function parseIsoWeekdayList(value: Json): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value)]
    .filter((day): day is number => typeof day === "number"
      && Number.isInteger(day)
      && day >= 1
      && day <= 7)
    .sort((a, b) => a - b);
}

export function parseFrequencyConfig(
  frequencyType: "daily",
  frequencyConfig: Json,
): DailyFrequencyConfig;
export function parseFrequencyConfig(
  frequencyType: "specific_weekdays",
  frequencyConfig: Json,
): SpecificWeekdaysFrequencyConfig;
export function parseFrequencyConfig(
  frequencyType: "weekly_count",
  frequencyConfig: Json,
): WeeklyCountFrequencyConfig;
export function parseFrequencyConfig(
  frequencyType: ProgressionFrequencyType,
  frequencyConfig: Json,
): DailyFrequencyConfig | SpecificWeekdaysFrequencyConfig | WeeklyCountFrequencyConfig {
  if (!isRecord(frequencyConfig)) {
    return frequencyType === "weekly_count" ? { targetCount: 1 } : {};
  }

  if (frequencyType === "specific_weekdays") {
    return { weekdays: parseIsoWeekdayList(frequencyConfig.weekdays) };
  }

  if (frequencyType === "weekly_count") {
    return { targetCount: parsePositiveInteger(frequencyConfig.targetCount, 1) };
  }

  return {};
}

export function isWeeklyCountAvailable(
  action: ProgressionFrequencyAction,
  weekCheckins: ProgressionCheckinSummary[],
): boolean {
  if (!action.active || action.frequencyType !== "weekly_count") {
    return false;
  }

  const { targetCount } = parseFrequencyConfig("weekly_count", action.frequencyConfig);
  const completedDates = new Set(
    weekCheckins
      .filter((checkin) => checkin.actionId === action.id)
      .map((checkin) => checkin.localDate),
  );

  return completedDates.size < targetCount;
}

export function isActionDueToday(
  action: ProgressionFrequencyAction,
  todayContext: ProgressionTodayContext,
  weekCheckins: ProgressionCheckinSummary[] = [],
): boolean {
  if (!action.active) {
    return false;
  }

  if (action.frequencyType === "daily") {
    return true;
  }

  if (action.frequencyType === "specific_weekdays") {
    const { weekdays } = parseFrequencyConfig("specific_weekdays", action.frequencyConfig);
    return weekdays.includes(todayContext.isoWeekday);
  }

  return isWeeklyCountAvailable(
    action,
    weekCheckins.filter(
      (checkin) =>
        checkin.localDate >= todayContext.weekStart && checkin.localDate <= todayContext.weekEnd,
    ),
  );
}
