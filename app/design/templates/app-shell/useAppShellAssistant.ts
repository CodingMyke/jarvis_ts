"use client";

import { useContext, type ContextType } from "react";
import { AppShellAssistantContext } from "./AppShellAssistantProvider";

export function useAppShellAssistant(): NonNullable<ContextType<typeof AppShellAssistantContext>> {
  const context = useContext(AppShellAssistantContext);

  if (!context) {
    throw new Error("useAppShellAssistant must be used within AppShellAssistantProvider");
  }

  return context;
}
