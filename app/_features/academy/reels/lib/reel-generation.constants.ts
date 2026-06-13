export const REEL_GENERATION_TRIGGER_SOURCES = [
  "scheduled",
  "manual_global",
  "manual_field",
] as const;

export const REEL_GENERATION_RUN_TYPES = ["batch", "reel"] as const;

export const REEL_GENERATION_QUEUE_JOB_STATUSES = [
  "queued",
  "processing",
  "completed",
  "failed",
  "canceled",
] as const;

export const REEL_GENERATION_RUN_LOG_STATUSES = ["started", "completed", "failed"] as const;

export const REEL_GENERATION_TARGET_FIELDS = ["title", "caption", "body", "hashtags"] as const;

