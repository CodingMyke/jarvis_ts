// @vitest-environment jsdom

import { render, renderHook, screen, waitFor } from "@testing-library/react";
import React, { type ReactNode } from "react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getProgressionStatus,
} from "@/app/_features/progression/lib/progression-client";
import { AppShellProgressionProvider } from "./AppShellProgressionProvider";
import { useAppShellProgression } from "./useAppShellProgression";

vi.mock("@/app/_features/progression/lib/progression-client", () => ({
  getProgressionStatus: vi.fn(),
}));

vi.mock("@/app/_features/progression/server/progression-dates", () => ({
  getMillisecondsUntilNextLocalMidnight: vi.fn(() => 25),
}));

function ProviderWrapper({ children }: { children: ReactNode }) {
  return <AppShellProgressionProvider>{children}</AppShellProgressionProvider>;
}

describe("AppShellProgressionProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getProgressionStatus).mockResolvedValue({
      success: true,
      status: "WARNING",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads progression status on mount and maps WARNING to the sidebar flag", async () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const { result } = renderHook(() => useAppShellProgression(), {
      wrapper: ProviderWrapper,
    });

    await waitFor(() => {
      expect(getProgressionStatus).toHaveBeenCalledWith(timezone);
      expect(result.current.hasProgressionDeadlineWarning).toBe(true);
    });
  });

  it("keeps OK false and refreshes status again at local midnight", async () => {
    vi.useFakeTimers();
    vi.mocked(getProgressionStatus)
      .mockResolvedValueOnce({
        success: true,
        status: "OK",
      })
      .mockResolvedValueOnce({
        success: true,
        status: "WARNING",
      });

    const { result } = renderHook(() => useAppShellProgression(), {
      wrapper: ProviderWrapper,
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.hasProgressionDeadlineWarning).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(25);
      await Promise.resolve();
    });

    expect(getProgressionStatus).toHaveBeenCalledTimes(2);
    expect(result.current.hasProgressionDeadlineWarning).toBe(true);
  });

  it("fails softly without blocking shell rendering", async () => {
    vi.mocked(getProgressionStatus).mockResolvedValueOnce({
      success: false,
      error: "STATUS_FAILED",
      errorMessage: "Status failed",
    });

    render(
      <AppShellProgressionProvider>
        <div>Shell content</div>
      </AppShellProgressionProvider>,
    );

    expect(screen.getByText("Shell content")).toBeInTheDocument();
    await waitFor(() => {
      expect(getProgressionStatus).toHaveBeenCalledOnce();
    });
  });
});
