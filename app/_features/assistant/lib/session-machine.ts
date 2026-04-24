export type AssistantSessionState = "idle" | "wake_word" | "connected";

export type AssistantSessionEvent =
  | "START_LISTENING"
  | "CONNECT_SUCCESS"
  | "END_CONVERSATION"
  | "CONNECTION_LOST"
  | "SWITCH_CHAT"
  | "DELETE_CHAT"
  | "DISABLE_ASSISTANT"
  | "STOP_LISTENING";

const IDLE_EVENTS = new Set<AssistantSessionEvent>([
  "DISABLE_ASSISTANT",
  "STOP_LISTENING",
]);

const WAKE_WORD_EVENTS = new Set<AssistantSessionEvent>([
  "START_LISTENING",
  "END_CONVERSATION",
  "CONNECTION_LOST",
  "SWITCH_CHAT",
  "DELETE_CHAT",
]);

const CONNECTED_EVENTS = new Set<AssistantSessionEvent>(["CONNECT_SUCCESS"]);

/**
 * Pure reducer for the assistant runtime session state.
 */
export function transitionAssistantSession(
  state: AssistantSessionState,
  event: AssistantSessionEvent
): AssistantSessionState {
  if (IDLE_EVENTS.has(event)) {
    return "idle";
  }

  if (WAKE_WORD_EVENTS.has(event)) {
    return "wake_word";
  }

  if (CONNECTED_EVENTS.has(event)) {
    return "connected";
  }

  return state;
}
