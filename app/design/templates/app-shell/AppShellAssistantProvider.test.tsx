// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import React, { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShellAssistantProvider } from "./AppShellAssistantProvider";
import { useAppShellAssistant } from "./useAppShellAssistant";

const providerMocks = vi.hoisted(() => ({
  calendarRefresh: vi.fn(),
  startListening: vi.fn(),
  stopListening: vi.fn(),
  tasksRefresh: vi.fn(),
  useVoiceChat: vi.fn(),
}));

vi.mock("@/app/_features/assistant/hooks/useVoiceChat", () => ({
  useVoiceChat: providerMocks.useVoiceChat,
}));

vi.mock("@/app/_features/calendar/state/calendar.store", () => ({
  useCalendarStore: (
    selector: (state: { refresh: () => Promise<void> }) => unknown,
  ) => selector({ refresh: providerMocks.calendarRefresh }),
}));

vi.mock("@/app/_features/tasks/state/tasks.store", () => ({
  useTasksStore: (
    selector: (state: { refresh: () => Promise<void> }) => unknown,
  ) => selector({ refresh: providerMocks.tasksRefresh }),
}));

function ProviderWrapper({ children }: { children: ReactNode }) {
  return <AppShellAssistantProvider>{children}</AppShellAssistantProvider>;
}

describe("AppShellAssistantProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    providerMocks.calendarRefresh.mockReset();
    providerMocks.startListening.mockReset();
    providerMocks.stopListening.mockReset();
    providerMocks.tasksRefresh.mockReset();
    providerMocks.useVoiceChat.mockReset();

    providerMocks.calendarRefresh.mockResolvedValue(undefined);
    providerMocks.tasksRefresh.mockResolvedValue(undefined);
    providerMocks.useVoiceChat.mockReturnValue({
      listeningMode: "idle",
      startListening: providerMocks.startListening,
      stopListening: providerMocks.stopListening,
    });
  });

  it("toggles assistant from logo control and maps border class names", () => {
    const { result, rerender } = renderHook(() => useAppShellAssistant(), {
      wrapper: ProviderWrapper,
    });

    expect(result.current.listeningMode).toBe("idle");
    expect(result.current.logoBorderClassName).toBe("border-white/10");

    act(() => {
      result.current.onLogoToggle();
    });

    expect(providerMocks.startListening).toHaveBeenCalledOnce();

    providerMocks.useVoiceChat.mockReturnValue({
      listeningMode: "wake_word",
      startListening: providerMocks.startListening,
      stopListening: providerMocks.stopListening,
    });

    rerender();

    expect(result.current.listeningMode).toBe("wake_word");
    expect(result.current.logoBorderClassName).toBe("border-amber-400/80");

    act(() => {
      result.current.onLogoToggle();
    });

    expect(providerMocks.stopListening).toHaveBeenCalledOnce();

    providerMocks.useVoiceChat.mockReturnValue({
      listeningMode: "connected",
      startListening: providerMocks.startListening,
      stopListening: providerMocks.stopListening,
    });

    rerender();

    expect(result.current.listeningMode).toBe("connected");
    expect(result.current.logoBorderClassName).toBe("border-cyan-400/80");
  });

  it("refreshes calendar and tasks only for successful mutation tools", async () => {
    const { result } = renderHook(() => useAppShellAssistant(), {
      wrapper: ProviderWrapper,
    });

    const providerOptions = providerMocks.useVoiceChat.mock.calls[0]?.[0];

    act(() => {
      providerOptions?.onToolExecuted?.("createCalendarEvent", { success: true });
      providerOptions?.onToolExecuted?.("createTodo", { success: true });
      providerOptions?.onToolExecuted?.("createTodo", { success: false });
      providerOptions?.onToolExecuted?.("listChats", { success: true });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(result.current.listeningMode).toBe("idle");
    expect(providerMocks.calendarRefresh).toHaveBeenCalledOnce();
    expect(providerMocks.tasksRefresh).toHaveBeenCalledOnce();
  });
});
