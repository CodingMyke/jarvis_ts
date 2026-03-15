"use client";

import { useContext, type ContextType } from "react";
import { FloatingChatContext } from "./FloatingChatContext";

export function useFloatingChatContext(): NonNullable<
  ContextType<typeof FloatingChatContext>
> {
  const context = useContext(FloatingChatContext);

  if (!context) {
    throw new Error("useFloatingChatContext must be used within FloatingChatProvider");
  }

  return context;
}
