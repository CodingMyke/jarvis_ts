"use client";

import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ensureProgressionProfile,
  getProgressionOverview,
} from "@/app/_features/progression/lib/progression-client";
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

    async function loadOverview(): Promise<void> {
      try {
        await ensureProgressionProfile(getBrowserTimezone());
        const overviewResult = await getProgressionOverview();

        if (isCancelled || !overviewResult.success) {
          return;
        }

        setHasProgressionDeadlineWarning(
          overviewResult.overview.deadlineWarning === true,
        );

        const overviewProfile = overviewResult.overview.profile as Record<string, unknown> | undefined;
        const timezone = typeof overviewProfile?.timezone === "string"
          ? overviewProfile.timezone
          : getBrowserTimezone();

        timeoutId = setTimeout(() => {
          void loadOverview();
        }, getMillisecondsUntilNextLocalMidnight(timezone));
      } catch {
        if (!isCancelled) {
          return;
        }
      }
    }

    void loadOverview();

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
