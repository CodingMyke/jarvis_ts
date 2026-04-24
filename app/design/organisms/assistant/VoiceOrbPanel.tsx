"use client";

import { useVoiceOrbInteraction } from "@/app/design/organisms/assistant/voice-orb/useVoiceOrbInteraction";
import { useVoiceOrbStyles } from "@/app/design/organisms/assistant/voice-orb/useVoiceOrbStyles";

type OrbState = "idle" | "listening" | "speaking";

interface VoiceOrbPanelProps {
  state: OrbState;
  audioLevel?: number;
  onClick?: () => void;
}

export function VoiceOrbPanel({
  state,
  audioLevel = 0,
  onClick,
}: VoiceOrbPanelProps) {
  const { isPressed, handlers } = useVoiceOrbInteraction(onClick);
  const styles = useVoiceOrbStyles(state, audioLevel, isPressed);
  const isActive = state !== "idle";
  const isSpeaking = state === "speaking";
  const isListening = state === "listening";
  const stateClass = isSpeaking ? "speaking" : isListening ? "listening" : "";

  return (
    <div className={`orb-container ${isPressed ? "pressed" : ""}`}>
      <div className={`orb-glow ${stateClass}`} style={styles.glow} />
      <div
        className={`orb-core pointer-events-auto ${stateClass} ${isActive ? "active" : ""} ${isListening ? "listening-pulse" : ""} ${isPressed ? "pressed" : ""}`}
        style={styles.core}
        role="button"
        tabIndex={0}
        aria-label={isActive ? "Ferma assistente vocale" : "Avvia assistente vocale"}
        {...handlers}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick?.();
          }
        }}
      />
    </div>
  );
}
