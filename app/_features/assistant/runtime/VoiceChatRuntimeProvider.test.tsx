// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceChatRuntimeProvider } from "./VoiceChatRuntimeProvider";
import { useVoiceChat } from "../hooks/useVoiceChat";
import { useVoiceChatRuntime } from "./useVoiceChatRuntime";

const providerMocks = vi.hoisted(() => {
  const snapshot = {
    connectionState: "disconnected" as const,
    listeningMode: "idle" as const,
    isMuted: false,
    messages: [],
    audioLevel: 0,
    outputAudioLevel: 0,
    error: null,
    chatId: null,
    chatTitle: null,
  };

  return {
    createVoiceChatRuntime: vi.fn(() => ({
      getSnapshot: vi.fn(() => snapshot),
      subscribe: vi.fn(() => () => undefined),
      subscribeToolExecuted: vi.fn(() => () => undefined),
      startListening: vi.fn(),
      stopListening: vi.fn(),
      toggleMute: vi.fn(),
      deleteCurrentChat: vi.fn(async () => undefined),
      dispose: vi.fn(),
    })),
  };
});

vi.mock("@/app/_features/assistant/lib", async () => {
  const actual = await vi.importActual<typeof import("@/app/_features/assistant/lib")>(
    "@/app/_features/assistant/lib",
  );

  return {
    ...actual,
    createVoiceChatRuntime: providerMocks.createVoiceChatRuntime,
  };
});

function ListeningModeConsumer() {
  const { listeningMode } = useVoiceChat();
  return <span>{listeningMode}</span>;
}

function RuntimeIdentityConsumer() {
  const runtime = useVoiceChatRuntime();
  return <span>{runtime ? "ready" : "missing"}</span>;
}

describe("VoiceChatRuntimeProvider", () => {
  beforeEach(() => {
    providerMocks.createVoiceChatRuntime.mockClear();
  });

  it("creates one runtime instance and disposes it on unmount", () => {
    const { unmount } = render(
      <VoiceChatRuntimeProvider>
        <RuntimeIdentityConsumer />
      </VoiceChatRuntimeProvider>,
    );

    expect(screen.getByText("ready")).toBeInTheDocument();
    expect(providerMocks.createVoiceChatRuntime).toHaveBeenCalledTimes(1);

    const runtime = providerMocks.createVoiceChatRuntime.mock.results[0]?.value;
    unmount();

    expect(runtime.dispose).toHaveBeenCalledOnce();
  });

  it("shares one runtime across multiple consumers", () => {
    render(
      <VoiceChatRuntimeProvider>
        <ListeningModeConsumer />
        <ListeningModeConsumer />
      </VoiceChatRuntimeProvider>,
    );

    expect(screen.getAllByText("idle")).toHaveLength(2);
    expect(providerMocks.createVoiceChatRuntime).toHaveBeenCalledTimes(1);
  });
});
