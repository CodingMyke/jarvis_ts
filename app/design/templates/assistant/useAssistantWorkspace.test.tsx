// @vitest-environment jsdom
// used the fkg testing skill zioo

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAssistantWorkspace } from "./useAssistantWorkspace";

const workspaceMocks = vi.hoisted(() => ({
  calendarState: {
    applyEventMutationResult: vi.fn(),
    refresh: vi.fn(),
  },
  deleteCalendarEvent: vi.fn(),
  ensureTimerStoreSubscription: vi.fn(),
  initializeCalendarStore: vi.fn(),
  initializeTasksStore: vi.fn(),
  tasksState: {
    refresh: vi.fn(),
  },
  useVoiceChat: vi.fn(),
}));

vi.mock("@/app/_features/assistant/hooks/useVoiceChat", () => ({
  useVoiceChat: workspaceMocks.useVoiceChat,
}));

vi.mock("@/app/_features/calendar/lib/calendar-client", () => ({
  deleteCalendarEvent: workspaceMocks.deleteCalendarEvent,
}));

vi.mock("@/app/_features/calendar/state/calendar.store", () => ({
  initializeCalendarStore: workspaceMocks.initializeCalendarStore,
  useCalendarStore: (
    selector: (state: typeof workspaceMocks.calendarState) => unknown,
  ) => selector(workspaceMocks.calendarState),
}));

vi.mock("@/app/_features/tasks/state/tasks.store", () => ({
  initializeTasksStore: workspaceMocks.initializeTasksStore,
  useTasksStore: (
    selector: (state: typeof workspaceMocks.tasksState) => unknown,
  ) => selector(workspaceMocks.tasksState),
}));

vi.mock("@/app/_features/timer/state/timer.store", () => ({
  ensureTimerStoreSubscription: workspaceMocks.ensureTimerStoreSubscription,
}));

describe("useAssistantWorkspace", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    workspaceMocks.calendarState.applyEventMutationResult.mockReset();
    workspaceMocks.calendarState.refresh.mockReset();
    workspaceMocks.deleteCalendarEvent.mockReset();
    workspaceMocks.ensureTimerStoreSubscription.mockReset();
    workspaceMocks.initializeCalendarStore.mockReset();
    workspaceMocks.initializeTasksStore.mockReset();
    workspaceMocks.tasksState.refresh.mockReset();
    workspaceMocks.useVoiceChat.mockReset();

    workspaceMocks.calendarState.refresh.mockResolvedValue(undefined);
    workspaceMocks.tasksState.refresh.mockResolvedValue(undefined);
    workspaceMocks.deleteCalendarEvent.mockResolvedValue({ success: true });

    workspaceMocks.useVoiceChat.mockReturnValue({
      chatTitle: "Chat corrente",
      deleteChat: vi.fn(),
      error: null,
      listeningMode: "idle",
      messages: [{ id: "assistant-1", text: "Ciao", isUser: false }],
      outputAudioLevel: 0.45,
      startListening: vi.fn(),
      stopListening: vi.fn(),
    });
  });

  it("bootstraps domain stores, maps UI state and refreshes domains after tool executions", async () => {
    const initialEvents = [{ dateISO: "2026-03-15", events: [] }];
    const initialTodos = [
      { id: "todo-1", text: "Studiare", completed: false, createdAt: 0, updatedAt: 0 },
    ];

    const { result, rerender } = renderHook(
      ({ events, todos }) =>
        useAssistantWorkspace({
          initialEvents: events,
          initialTodos: todos,
        }),
      {
        initialProps: {
          events: initialEvents,
          todos: initialTodos,
        },
      },
    );

    expect(workspaceMocks.initializeCalendarStore).toHaveBeenCalledWith(initialEvents);
    expect(workspaceMocks.initializeTasksStore).toHaveBeenCalledWith(initialTodos);
    expect(workspaceMocks.ensureTimerStoreSubscription).toHaveBeenCalledOnce();
    expect(result.current.assistantName).toBe("Jarvis");
    expect(result.current.chatTitle).toBe("Chat corrente");
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.orbState).toBe("idle");

    act(() => {
      result.current.onMicrophoneClick();
    });

    expect(
      workspaceMocks.useVoiceChat.mock.results[0]?.value.startListening,
    ).toHaveBeenCalledOnce();

    workspaceMocks.useVoiceChat.mockReturnValue({
      ...workspaceMocks.useVoiceChat.mock.results[0]?.value,
      listeningMode: "connected",
    });

    rerender({
      events: initialEvents,
      todos: initialTodos,
    });

    expect(result.current.orbState).toBe("speaking");

    act(() => {
      result.current.onMicrophoneClick();
    });

    expect(
      workspaceMocks.useVoiceChat.mock.results[1]?.value.stopListening,
    ).toHaveBeenCalledOnce();

    const workspaceOptions = workspaceMocks.useVoiceChat.mock.calls[0]?.[0];

    act(() => {
      workspaceOptions?.onToolExecuted?.("createCalendarEvent", { success: true });
      workspaceOptions?.onToolExecuted?.("createTodo", { success: true });
      workspaceOptions?.onToolExecuted?.("createTodo", { success: false });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(workspaceMocks.calendarState.refresh).toHaveBeenCalledOnce();
    expect(workspaceMocks.tasksState.refresh).toHaveBeenCalledOnce();
  });

  it("deletes calendar events, applies optimistic mutations and returns failures unchanged", async () => {
    const { result } = renderHook(() =>
      useAssistantWorkspace({
        initialEvents: [],
        initialTodos: [],
      }),
    );

    await expect(result.current.onDeleteEvent("evt-1")).resolves.toEqual({ success: true });
    expect(workspaceMocks.deleteCalendarEvent).toHaveBeenCalledWith({ eventId: "evt-1" });
    expect(workspaceMocks.calendarState.applyEventMutationResult).toHaveBeenCalledWith({
      removedEventId: "evt-1",
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(workspaceMocks.calendarState.refresh).toHaveBeenCalledOnce();

    workspaceMocks.deleteCalendarEvent.mockResolvedValueOnce({
      success: false,
      errorMessage: "Impossibile eliminare",
    });

    await expect(result.current.onDeleteEvent("evt-2")).resolves.toEqual({
      success: false,
      errorMessage: "Impossibile eliminare",
    });
  });
});
