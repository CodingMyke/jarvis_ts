"use client";

import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ensureUserSettings } from "@/app/_features/user-settings";
import { getProgressionStatus } from "@/app/_features/progression/lib/progression-client";
import { getMillisecondsUntilNextLocalMidnight } from "@/app/_features/progression/server/progression-dates";

export interface AppShellProgressionContextValue {
  hasProgressionDeadlineWarning: boolean;
  openProgressionHistory: (() => void) | null;
  setOpenProgressionHistory: (openProgressionHistory: (() => void) | null) => void;
}

export const AppShellProgressionContext =
  createContext<AppShellProgressionContextValue | null>(null);

function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function AppShellProgressionProvider({ children }: { children: ReactNode }) {
  const [hasProgressionDeadlineWarning, setHasProgressionDeadlineWarning] = useState(false);
  const [openProgressionHistory, setOpenProgressionHistory] = useState<(() => void) | null>(
    null,
  );

  useEffect(() => {
    let isCancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const loadPersistedStatus =
      getProgressionStatus as () => ReturnType<typeof getProgressionStatus>;

    async function loadStatus(): Promise<void> {
      try {
        const browserTimezone = getBrowserTimezone();
        const ensured = await ensureUserSettings(browserTimezone);

        if (isCancelled || !ensured.success) {
          return;
        }

        const statusResult = await loadPersistedStatus();

        if (isCancelled || !statusResult.success) {
          return;
        }

        setHasProgressionDeadlineWarning(statusResult.status === "WARNING");

        timeoutId = setTimeout(() => {
          void loadStatus();
        }, getMillisecondsUntilNextLocalMidnight(ensured.settings.timezone));
      } catch {
        if (!isCancelled) {
          return;
        }
      }
    }

    void loadStatus();

    return () => {
      isCancelled = true;
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const value = useMemo<AppShellProgressionContextValue>(
    () => ({
      hasProgressionDeadlineWarning,
      openProgressionHistory,
      setOpenProgressionHistory,
    }),
    [hasProgressionDeadlineWarning, openProgressionHistory],
  );

  return (
    <AppShellProgressionContext.Provider value={value}>
      {children}
    </AppShellProgressionContext.Provider>
  );
}
