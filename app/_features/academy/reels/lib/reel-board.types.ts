import type { z } from "zod";
import type { Database } from "@/app/_server/supabase/database.types";
import { REEL_BOARD_STATUSES, REEL_ORIGINS } from "./reel-board.constants";
import { reelSchema } from "./reel-board.schemas";

export type ReelStatus = (typeof REEL_BOARD_STATUSES)[number];
export type ReelOrigin = (typeof REEL_ORIGINS)[number];

export type ReelRow = z.output<typeof reelSchema>;
export type ReelInsert = Database["public"]["Tables"]["academy_reels"]["Insert"];
export type ReelUpdate = Database["public"]["Tables"]["academy_reels"]["Update"];

export type ReelBoardColumns = Record<ReelStatus, ReelRow[]>;

export interface ReelBoard {
  columns: ReelBoardColumns;
  count: number;
}

export const EMPTY_REEL_BOARD: ReelBoard = {
  columns: {
    ai_idea: [],
    idea: [],
    script: [],
    to_record: [],
    to_edit: [],
    ready: [],
    published: [],
  },
  count: 0,
};

export interface CreateReelInput {
  idea: string;
}

export interface UpdateReelInput {
  idea?: string;
  title?: string | null;
  caption?: string | null;
  body?: string | null;
  hashtags?: string | null;
  notes?: string | null;
  scheduled_at?: string | null;
  published_at?: string | null;
}

export interface UpdateReelStatusInput {
  status: ReelStatus;
}
