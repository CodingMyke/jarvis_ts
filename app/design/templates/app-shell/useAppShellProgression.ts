"use client";

import { useContext, type ContextType } from "react";
import { AppShellProgressionContext } from "./AppShellProgressionProvider";

export function useAppShellProgression():
  NonNullable<ContextType<typeof AppShellProgressionContext>> {
  const context = useContext(AppShellProgressionContext);

  if (!context) {
    throw new Error("useAppShellProgression must be used within AppShellProgressionProvider");
  }

  return context;
}
