import type { AssistantSessionState } from "@/app/_features/assistant/lib";

export function useAssistantOrbState(
  listeningMode: AssistantSessionState,
): "idle" | "listening" | "speaking" {
  switch (listeningMode) {
    case "connected":
      return "speaking";
    case "wake_word":
      return "listening";
    default:
      return "idle";
  }
}
