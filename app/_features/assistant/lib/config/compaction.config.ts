/**
 * Parameters for assistant history retention.
 * assistant_history should stay at or below SUMMARY_WINDOW_SIZE turns.
 * If the history grows beyond the window, the oldest turns are trimmed and the
 * newest turns are kept as-is.
 */

export const SUMMARY_WINDOW_SIZE = 30;
