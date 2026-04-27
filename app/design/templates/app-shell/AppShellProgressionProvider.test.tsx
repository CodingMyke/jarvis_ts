// @vitest-environment jsdom

import { render, renderHook, screen, waitFor } from "@testing-library/react";
import React, { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureProgressionProfile,
  getProgressionOverview,
} from "@/app/_features/progression/lib/progression-client";
import { AppShellProgressionProvider } from "./AppShellProgressionProvider";
import { useAppShellProgression } from "./useAppShellProgression";

vi.mock("@/app/_features/progression/lib/progression-client", () => ({
  ensureProgressionProfile: vi.fn(),
  getProgressionOverview: vi.fn(),
}));

function ProviderWrapper({ children }: { children: ReactNode }) {
  return <AppShellProgressionProvider>{children}</AppShellProgressionProvider>;
}

describe("AppShellProgressionProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureProgressionProfile).mockResolvedValue({
      success: true,
      profile: { timezone: "Europe/Rome" },
    });
    vi.mocked(getProgressionOverview).mockResolvedValue({
      success: true,
      overview: { deadlineWarning: true },
    });
  });

  it("ensures the browser timezone and refreshes deadline warning on mount", async () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const { result } = renderHook(() => useAppShellProgression(), {
      wrapper: ProviderWrapper,
    });

    await waitFor(() => {
      expect(ensureProgressionProfile).toHaveBeenCalledWith(timezone);
      expect(getProgressionOverview).toHaveBeenCalledOnce();
      expect(result.current.hasProgressionDeadlineWarning).toBe(true);
    });
  });

  it("fails softly without blocking shell rendering", async () => {
    vi.mocked(ensureProgressionProfile).mockResolvedValueOnce({
      success: false,
      error: "PROFILE_FAILED",
      errorMessage: "Profile failed",
    });
    vi.mocked(getProgressionOverview).mockResolvedValueOnce({
      success: false,
      error: "OVERVIEW_FAILED",
      errorMessage: "Overview failed",
    });

    render(
      <AppShellProgressionProvider>
        <div>Shell content</div>
      </AppShellProgressionProvider>,
    );

    expect(screen.getByText("Shell content")).toBeInTheDocument();
    await waitFor(() => {
      expect(ensureProgressionProfile).toHaveBeenCalledOnce();
    });
  });
});
