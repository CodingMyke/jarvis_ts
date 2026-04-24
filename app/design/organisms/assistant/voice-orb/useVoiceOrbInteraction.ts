"use client";

import { useCallback, useState } from "react";

export function useVoiceOrbInteraction(onClick?: () => void): {
  isPressed: boolean;
  handlers: {
    onClick: () => void;
    onPointerDown: () => void;
    onPointerLeave: () => void;
    onPointerUp: () => void;
  };
} {
  const [isPressed, setIsPressed] = useState(false);

  return {
    isPressed,
    handlers: {
      onPointerDown: useCallback(() => {
        setIsPressed(true);
      }, []),
      onPointerUp: useCallback(() => {
        setIsPressed(false);
      }, []),
      onPointerLeave: useCallback(() => {
        setIsPressed(false);
      }, []),
      onClick: useCallback(() => {
        onClick?.();
      }, [onClick]),
    },
  };
}
