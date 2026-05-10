// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useVoiceChat } from "./useVoiceChat";

const hookMocks = vi.hoisted(() => ({
  runtime: {
    getSnapshot: vi.fn(),
    subscribe: vi.fn(),
    subscribeToolExecuted: vi.fn(),
    startListening: vi.fn(),
    stopListening: vi.fn(),
    toggleMute: vi.fn(),
    deleteCurrentChat: vi.fn(async () => undefined),
    dispose: vi.fn(),
  },
  useVoiceChatRuntime: vi.fn(),
}));

vi.mock("../runtime/useVoiceChatRuntime", () => ({
  useVoiceChatRuntime: hookMocks.useVoiceChatRuntime,
}));

describe("useVoiceChat", () => {
  beforeEach(() => {
    hookMocks.runtime.getSnapshot.mockReset();
    hookMocks.runtime.subscribe.mockReset();
    hookMocks.runtime.subscribeToolExecuted.mockReset();
    hookMocks.runtime.startListening.mockReset();
    hookMocks.runtime.stopListening.mockReset();
    hookMocks.runtime.toggleMute.mockReset();
    hookMocks.runtime.deleteCurrentChat.mockReset();
    hookMocks.useVoiceChatRuntime.mockReset();

    hookMocks.runtime.getSnapshot.mockReturnValue({
      connectionState: "connected",
      listeningMode: "wake_word",
      isMuted: true,
      messages: [{ id: "assistant-1", text: "Ciao", isUser: false }],
      audioLevel: 0.25,
      outputAudioLevel: 0.5,
      error: null,
      chatId: "chat-1",
      chatTitle: "Chat corrente",
    });
    hookMocks.runtime.subscribe.mockReturnValue(() => undefined);
    hookMocks.runtime.subscribeToolExecuted.mockReturnValue(() => undefined);
    hookMocks.runtime.deleteCurrentChat.mockResolvedValue(undefined);
    hookMocks.useVoiceChatRuntime.mockReturnValue(hookMocks.runtime);
  });

  it("maps runtime snapshot state to the legacy hook shape", () => {
    const { result } = renderHook(() => useVoiceChat());

    expect(result.current).toMatchObject({
      isConnected: true,
      isListening: true,
      isMuted: true,
      messages: [{ id: "assistant-1", text: "Ciao", isUser: false }],
      audioLevel: 0.25,
      outputAudioLevel: 0.5,
      error: null,
      connectionState: "connected",
      listeningMode: "wake_word",
      chatId: "chat-1",
      chatTitle: "Chat corrente",
    });
    expect(hookMocks.runtime.subscribe).toHaveBeenCalledOnce();
  });

  it("forwards commands to the shared runtime", () => {
    const { result } = renderHook(() => useVoiceChat());

    act(() => {
      result.current.startListening();
      result.current.stopListening();
      result.current.toggleMute();
      result.current.deleteChat();
    });

    expect(hookMocks.runtime.startListening).toHaveBeenCalledOnce();
    expect(hookMocks.runtime.stopListening).toHaveBeenCalledOnce();
    expect(hookMocks.runtime.toggleMute).toHaveBeenCalledOnce();
    expect(hookMocks.runtime.deleteCurrentChat).toHaveBeenCalledOnce();
  });
});
