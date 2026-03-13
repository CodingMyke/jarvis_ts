"use client";

import { useState, useCallback, useMemo } from "react";

type OrbState = "idle" | "listening" | "speaking";

interface VoiceOrbProps {
  state: OrbState;
  audioLevel?: number; // 0-1
  onClick?: () => void;
}

function useOrbInteraction(onClick?: () => void) {
  const [isPressed, setIsPressed] = useState(false);

  const handlePointerDown = useCallback(() => {
    setIsPressed(true);
  }, []);

  const handlePointerUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  return {
    isPressed,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
      onPointerLeave: handlePointerLeave,
      onClick: handleClick,
    },
  };
}

function useOrbStyles(state: OrbState, audioLevel: number, isPressed: boolean) {
  return useMemo(() => {
    // Scale: idle più piccolo, attivo più grande
    const baseScale = state === "idle" ? 0.85 : 1.5;
    const audioScale = state === "speaking" ? audioLevel * 0.15 : 0;
    const pressScale = isPressed ? -0.15 : 0;
    const coreScale = baseScale + audioScale + pressScale;

    // Glow molto più reattivo all'audio
    const baseGlowScale = state === "idle" ? 1 : 1.2;
    const audioGlowScale = state === "speaking" ? audioLevel * 1.5 : 0;
    const glowScale = baseGlowScale + audioGlowScale;

    // Opacità glow molto più reattiva
    const baseOpacity = state === "idle" ? 0.25 : 0.5;
    const audioOpacity = state === "speaking" ? audioLevel * 0.5 : 0;
    const glowOpacity = Math.min(1, baseOpacity + audioOpacity);

    // Blur dinamico per il glow
    const baseBlur = 60;
    const audioBlur = state === "speaking" ? audioLevel * 40 : 0;
    const glowBlur = baseBlur + audioBlur;

    return {
      core: {
        transform: `scale(${coreScale})`,
        willChange: "transform",
      },
      glow: {
        opacity: glowOpacity,
        transform: `scale(${glowScale})`,
        filter: `blur(${glowBlur}px)`,
        willChange: state === "speaking" ? "transform, opacity, filter" : "transform, opacity",
      },
    };
  }, [state, audioLevel, isPressed]);
}

export function VoiceOrb({ state, audioLevel = 0, onClick }: VoiceOrbProps) {
  const { isPressed, handlers } = useOrbInteraction(onClick);
  const styles = useOrbStyles(state, audioLevel, isPressed);

  const isActive = state !== "idle";
  const isSpeaking = state === "speaking";
  const isListening = state === "listening";

  // Classe per lo stato colore
  const stateClass = isSpeaking ? "speaking" : isListening ? "listening" : "";

  return (
    <div className={`orb-container ${isPressed ? "pressed" : ""}`}>
      {/* Glow background */}
      <div className={`orb-glow ${stateClass}`} style={styles.glow} />

      {/* Core orb - area cliccabile */}
      <div
        className={`orb-core pointer-events-auto ${stateClass} ${isActive ? "active" : ""} ${isListening ? "listening-pulse" : ""} ${isPressed ? "pressed" : ""}`}
        style={styles.core}
        role="button"
        tabIndex={0}
        aria-label={isActive ? "Ferma assistente vocale" : "Avvia assistente vocale"}
        {...handlers}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick?.();
          }
        }}
      />
    </div>
  );
}
