"use client";

import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ensureProgressionProfile,
  getProgressionOverview,
} from "@/app/_features/progression/lib/progression-client";

export interface AppShellProgressionContextValue {
  hasProgressionDeadlineWarning: boolean;
}

export const AppShellProgressionContext =
  createContext<AppShellProgressionContextValue | null>(null);

function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function AppShellProgressionProvider({ children }: { children: ReactNode }) {
  const [hasProgressionDeadlineWarning, setHasProgressionDeadlineWarning] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function bootstrapProgression(): Promise<void> {
      try {
        await ensureProgressionProfile(getBrowserTimezone());
        const overviewResult = await getProgressionOverview();

        if (!isCancelled && overviewResult.success) {
          setHasProgressionDeadlineWarning(
            overviewResult.overview.deadlineWarning === true,
          );
        }
      } catch {
        if (!isCancelled) {
          setHasProgressionDeadlineWarning(false);
        }
      }
    }

    void bootstrapProgression();

    return () => {
      isCancelled = true;
    };
  }, []);

  const value = useMemo<AppShellProgressionContextValue>(
    () => ({ hasProgressionDeadlineWarning }),
    [hasProgressionDeadlineWarning],
  );

  return (
    <AppShellProgressionContext.Provider value={value}>
      {children}
    </AppShellProgressionContext.Provider>
  );
}
