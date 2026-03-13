import { describe, expect, it } from "vitest";
import {
  transitionAssistantSession,
  type AssistantSessionState,
} from "./session-machine";

const SCENARIOS: Array<{
  state: AssistantSessionState;
  event:
    | "START_LISTENING"
    | "CONNECT_SUCCESS"
    | "END_CONVERSATION"
    | "CONNECTION_LOST"
    | "SWITCH_CHAT"
    | "DELETE_CHAT"
    | "DISABLE_ASSISTANT"
    | "STOP_LISTENING";
  expected: AssistantSessionState;
}> = [
  { state: "idle", event: "START_LISTENING", expected: "wake_word" },
  { state: "wake_word", event: "CONNECT_SUCCESS", expected: "connected" },
  { state: "connected", event: "END_CONVERSATION", expected: "wake_word" },
  { state: "connected", event: "DELETE_CHAT", expected: "wake_word" },
  { state: "connected", event: "SWITCH_CHAT", expected: "wake_word" },
  { state: "connected", event: "DISABLE_ASSISTANT", expected: "idle" },
  { state: "wake_word", event: "STOP_LISTENING", expected: "idle" },
  { state: "connected", event: "CONNECTION_LOST", expected: "wake_word" },
];

describe("assistant session machine", () => {
  it.each(SCENARIOS)(
    "moves from $state with $event to $expected",
    ({ state, event, expected }) => {
      expect(transitionAssistantSession(state, event)).toBe(expected);
    }
  );
});
