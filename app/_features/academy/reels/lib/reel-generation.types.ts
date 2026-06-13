import type { Database, Json } from "@/app/_server/supabase/database.types";
import type {
  REEL_GENERATION_QUEUE_JOB_STATUSES,
  REEL_GENERATION_RUN_LOG_STATUSES,
  REEL_GENERATION_RUN_TYPES,
  REEL_GENERATION_TARGET_FIELDS,
  REEL_GENERATION_TRIGGER_SOURCES,
} from "./reel-generation.constants";

export type ReelGenerationTriggerSource = (typeof REEL_GENERATION_TRIGGER_SOURCES)[number];
export type ReelGenerationRunType = (typeof REEL_GENERATION_RUN_TYPES)[number];
export type ReelGenerationTargetField = (typeof REEL_GENERATION_TARGET_FIELDS)[number];
export type ReelGenerationQueueJobStatus = (typeof REEL_GENERATION_QUEUE_JOB_STATUSES)[number];
export type ReelGenerationRunLogStatus = (typeof REEL_GENERATION_RUN_LOG_STATUSES)[number];

export interface ReelAutomationSettings {
  enabled: boolean;
  runTimes: string[];
  editorialContext: string | null;
}

export type ReelGenerationSettingsRow =
  Database["public"]["Tables"]["academy_reel_generation_settings"]["Row"];
export type ReelGenerationQueueJobRow =
  Database["public"]["Tables"]["academy_reel_generation_queue_jobs"]["Row"];
export type ReelGenerationRunLogRow =
  Database["public"]["Tables"]["academy_reel_generation_run_logs"]["Row"];

export type ReelGenerationSettingsConfig = Json & {
  enabled?: boolean;
  runTimes?: unknown;
  editorialContext?: unknown;
};

