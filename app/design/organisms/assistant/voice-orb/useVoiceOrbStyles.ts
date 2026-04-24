"use client";

import { useMemo } from "react";

type OrbState = "idle" | "listening" | "speaking";

export function useVoiceOrbStyles(
  state: OrbState,
  audioLevel: number,
  isPressed: boolean,
): {
  core: Record<string, string>;
  glow: Record<string, string | number>;
} {
  return useMemo(() => {
    const baseScale = state === "idle" ? 0.85 : 1.5;
    const audioScale = state === "speaking" ? audioLevel * 0.15 : 0;
    const pressScale = isPressed ? -0.15 : 0;
    const coreScale = baseScale + audioScale + pressScale;

    const baseGlowScale = state === "idle" ? 1 : 1.2;
    const audioGlowScale = state === "speaking" ? audioLevel * 1.5 : 0;
    const glowScale = baseGlowScale + audioGlowScale;

    const baseOpacity = state === "idle" ? 0.25 : 0.5;
    const audioOpacity = state === "speaking" ? audioLevel * 0.5 : 0;
    const glowOpacity = Math.min(1, baseOpacity + audioOpacity);

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
        willChange:
          state === "speaking" ? "transform, opacity, filter" : "transform, opacity",
      },
    };
  }, [audioLevel, isPressed, state]);
}
