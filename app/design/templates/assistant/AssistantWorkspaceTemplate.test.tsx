// @vitest-environment jsdom
// used the fkg testing skill zioo

import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { AssistantWorkspaceTemplate } from "./AssistantWorkspaceTemplate";

const templateMocks = vi.hoisted(() => ({
  useAssistantWorkspace: vi.fn(() => ({
    assistantName: "Jarvis",
    chatTitle: "Chat test",
    date: "15 marzo",
    dateRef: { current: null },
    day: "Domenica",
    dayRef: { current: null },
    errorMessage: "Errore test",
    listeningMode: "wake_word",
    messages: [{ id: "1", text: "ciao", isUser: true }],
    onDeleteChat: vi.fn(),
    onDeleteEvent: vi.fn(),
    onMicrophoneClick: vi.fn(),
    orbState: "listening",
    outputAudioLevel: 0.7,
    time: "09:30",
    timeRef: { current: null },
  })),
}));

vi.mock("./useAssistantWorkspace", () => ({
  useAssistantWorkspace: templateMocks.useAssistantWorkspace,
}));

vi.mock("@/app/design/organisms/assistant/AssistantActionsLink", () => ({
  AssistantActionsLink: () => <div>azioni</div>,
}));

vi.mock("@/app/design/organisms/assistant/AssistantClock", () => ({
  AssistantClock: ({ time }: { time: string }) => <div>clock {time}</div>,
}));

vi.mock("@/app/design/organisms/assistant/AssistantStatusPanel", () => ({
  AssistantStatusPanel: ({ assistantName }: { assistantName: string }) => (
    <div>status {assistantName}</div>
  ),
}));

vi.mock("@/app/design/organisms/assistant/FloatingChat", () => ({
  FloatingChat: ({ title }: { title?: string }) => <div>chat {title}</div>,
}));

vi.mock("@/app/design/organisms/assistant/VoiceOrbPanel", () => ({
  VoiceOrbPanel: ({ state }: { state: string }) => <div>orb {state}</div>,
}));

vi.mock("@/app/design/organisms/calendar/CalendarPanel", () => ({
  CalendarPanel: () => <div>calendar</div>,
}));

vi.mock("@/app/design/organisms/tasks/TodoPanel", () => ({
  TodoPanel: () => <div>todos</div>,
}));

vi.mock("@/app/design/organisms/timer/TimerPanel", () => ({
  TimerPanel: () => <div>timer</div>,
}));

describe("AssistantWorkspaceTemplate", () => {
  it("renders the workspace layout with the hook output", () => {
    render(<AssistantWorkspaceTemplate initialEvents={[]} initialTodos={[]} />);

    expect(screen.getByText("Errore test")).toBeInTheDocument();
    expect(screen.getByText("timer")).toBeInTheDocument();
    expect(screen.getByText("todos")).toBeInTheDocument();
    expect(screen.getByText("calendar")).toBeInTheDocument();
    expect(screen.getByText("clock 09:30")).toBeInTheDocument();
    expect(screen.getByText("status Jarvis")).toBeInTheDocument();
    expect(screen.getByText("orb listening")).toBeInTheDocument();
    expect(screen.getByText("chat Chat test")).toBeInTheDocument();
  });
});
