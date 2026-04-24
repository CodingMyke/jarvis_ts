// @vitest-environment jsdom
// used the fkg testing skill zioo

import { act, renderHook } from "@testing-library/react";
import type { ConversationTurn, VoiceChatError } from "@/app/_features/assistant/lib";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useVoiceChat } from "./useVoiceChat";

type MockClient = {
  __options: Record<string, (...args: unknown[]) => unknown>;
  connect: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  sendHistory: ReturnType<typeof vi.fn>;
  sendText: ReturnType<typeof vi.fn>;
  setMuted: ReturnType<typeof vi.fn>;
  startListening: ReturnType<typeof vi.fn>;
};

const voiceChatMocks = vi.hoisted(() => ({
  appendChatTurns: vi.fn(),
  clients: [] as MockClient[],
  connectImpl: vi.fn(),
  createChat: vi.fn(),
  deleteChatById: vi.fn(),
  fetchChatById: vi.fn(),
  startWakeWordLifecycle: vi.fn(),
  stopWakeWordLifecycle: vi.fn(),
  wakeWordManager: {
    resume: vi.fn(),
  },
  wakeWordOptions: null as {
    onError: (error: VoiceChatError) => void;
    onWakeWord: (transcript: string) => Promise<void>;
  } | null,
}));

vi.mock("@/app/_features/assistant/lib", async () => {
  const actual = await vi.importActual<typeof import("@/app/_features/assistant/lib")>(
    "@/app/_features/assistant/lib",
  );

  class MockVoiceChatClient {
    public __options: Record<string, (...args: unknown[]) => unknown>;
    public connect: ReturnType<typeof vi.fn>;
    public dispose: ReturnType<typeof vi.fn>;
    public sendHistory: ReturnType<typeof vi.fn>;
    public sendText: ReturnType<typeof vi.fn>;
    public setMuted: ReturnType<typeof vi.fn>;
    public startListening: ReturnType<typeof vi.fn>;

    public constructor(options: Record<string, (...args: unknown[]) => unknown>) {
      this.__options = options;
      this.connect = vi.fn(async () => {
        await voiceChatMocks.connectImpl(options, this);
      });
      this.dispose = vi.fn();
      this.sendHistory = vi.fn();
      this.sendText = vi.fn();
      this.setMuted = vi.fn();
      this.startListening = vi.fn(async () => undefined);

      voiceChatMocks.clients.push(this as MockClient);
    }
  }

  return {
    ...actual,
    GeminiProvider: class GeminiProvider {},
    VoiceChatClient: MockVoiceChatClient,
    appendChatTurns: voiceChatMocks.appendChatTurns,
    createChat: voiceChatMocks.createChat,
    deleteChatById: voiceChatMocks.deleteChatById,
    fetchChatById: voiceChatMocks.fetchChatById,
    startWakeWordLifecycle: voiceChatMocks.startWakeWordLifecycle,
    stopWakeWordLifecycle: voiceChatMocks.stopWakeWordLifecycle,
  };
});

function buildChat(id: string, overrides?: Partial<Record<string, unknown>>) {
  return {
    id,
    title: `Chat ${id}`,
    created_at: "2026-03-15T09:30:00.000Z",
    last_activity_at: "2026-03-15T09:30:00.000Z",
    ...overrides,
  };
}

function buildHistoryChat(id: string) {
  return {
    ...buildChat(id, { title: "Storica" }),
    full_history: [
      { role: "user", parts: [{ text: "Ciao" }] },
      { role: "model", parts: [{ text: "Bentornato" }], thinking: "Sto recuperando il contesto" },
    ] satisfies ConversationTurn[],
    assistant_history: [{ role: "model", parts: [{ text: "Riassunto compatto" }] }] satisfies ConversationTurn[],
  };
}

function getCurrentClient(): MockClient {
  const client = voiceChatMocks.clients.at(-1);

  if (!client) {
    throw new Error("expected a mock client");
  }

  return client;
}

async function triggerWakeWord(transcript: string): Promise<void> {
  await act(async () => {
    await voiceChatMocks.wakeWordOptions?.onWakeWord(transcript);
  });
}

async function flushAsync(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useVoiceChat", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T09:30:00.000Z"));

    voiceChatMocks.clients.length = 0;
    voiceChatMocks.wakeWordOptions = null;
    voiceChatMocks.appendChatTurns.mockReset();
    voiceChatMocks.connectImpl.mockReset();
    voiceChatMocks.createChat.mockReset();
    voiceChatMocks.deleteChatById.mockReset();
    voiceChatMocks.fetchChatById.mockReset();
    voiceChatMocks.startWakeWordLifecycle.mockReset();
    voiceChatMocks.stopWakeWordLifecycle.mockReset();
    voiceChatMocks.wakeWordManager.resume.mockReset();

    voiceChatMocks.connectImpl.mockImplementation(async (options) => {
      options.onStateChange("connecting");
      options.onStateChange("connected");
    });

    voiceChatMocks.startWakeWordLifecycle.mockImplementation((options) => {
      voiceChatMocks.wakeWordOptions = options;
      return voiceChatMocks.wakeWordManager;
    });

    voiceChatMocks.createChat.mockResolvedValue({
      success: true,
      chat: buildChat("chat-1"),
    });

    voiceChatMocks.appendChatTurns.mockResolvedValue({
      chat: buildChat("chat-1", { title: "Chat aggiornata" }),
    });

    voiceChatMocks.deleteChatById.mockResolvedValue({
      ok: true,
      message: null,
    });

    voiceChatMocks.fetchChatById.mockResolvedValue(null);
  });

  it("starts in wake-word mode, connects on wake word, appends transcripts and saves on stop", async () => {
    const { result } = renderHook(() => useVoiceChat());

    act(() => {
      result.current.startListening();
    });

    expect(result.current.listeningMode).toBe("wake_word");
    expect(voiceChatMocks.startWakeWordLifecycle).toHaveBeenCalledWith(
      expect.objectContaining({
        keyword: "Jarvis",
        language: "it-IT",
      }),
    );

    await triggerWakeWord("Jarvis");
    await flushAsync();

    expect(result.current.connectionState).toBe("connected");
    expect(getCurrentClient().sendText).toHaveBeenCalledWith("Jarvis");
    expect(result.current.chatId).toBe("chat-1");
    expect(result.current.chatTitle).toBe("Chat chat-1");
    expect(getCurrentClient().__options.getIsCurrentChatEmpty()).toBe(true);

    const baseTime = Date.now();

    act(() => {
      vi.setSystemTime(new Date(baseTime + 1));
      getCurrentClient().__options.onTranscript("Ciao ", "input");
      getCurrentClient().__options.onTranscript("mondo", "input");
      vi.setSystemTime(new Date(baseTime + 2));
      getCurrentClient().__options.onTranscript("Salve", "output");
      getCurrentClient().__options.onTranscript("!", "output");
    });

    expect(result.current.messages.map((message) => message.text)).toEqual([
      "Jarvis",
      "Ciao mondo",
      "Salve!",
    ]);
    expect(getCurrentClient().__options.getIsCurrentChatEmpty()).toBe(false);

    act(() => {
      result.current.toggleMute();
    });

    expect(getCurrentClient().setMuted).toHaveBeenCalledWith(true);
    expect(result.current.isMuted).toBe(true);

    act(() => {
      result.current.stopListening();
    });
    await flushAsync();

    expect(voiceChatMocks.appendChatTurns).toHaveBeenCalledWith("chat-1", expect.any(Array));
    expect(getCurrentClient().dispose).toHaveBeenCalledOnce();
    expect(voiceChatMocks.stopWakeWordLifecycle).toHaveBeenCalledWith(
      voiceChatMocks.wakeWordManager,
    );
    expect(result.current.connectionState).toBe("disconnected");
    expect(result.current.listeningMode).toBe("idle");
  });

  it("preloads an existing chat, sends assistant history and resumes wake-word mode on disconnect", async () => {
    voiceChatMocks.fetchChatById.mockResolvedValue({
      success: true,
      chat: buildHistoryChat("seed-chat"),
    });

    const { result } = renderHook(() => useVoiceChat({ initialChatId: "seed-chat" }));

    act(() => {
      result.current.startListening();
    });

    await triggerWakeWord("Jarvis riprendi");
    await flushAsync();

    expect(result.current.chatTitle).toBe("Storica");
    expect(getCurrentClient().sendHistory).toHaveBeenCalledWith(
      [{ role: "model", parts: [{ text: "Riassunto compatto" }] }],
      false,
    );
    expect(result.current.messages[0]).toMatchObject({
      text: "Ciao",
      isUser: true,
    });
    expect(result.current.messages[1]).toMatchObject({
      text: "Bentornato",
      thinking: "Sto recuperando il contesto",
      isUser: false,
    });

    act(() => {
      getCurrentClient().__options.onStateChange("disconnected");
    });
    await flushAsync();

    expect(result.current.listeningMode).toBe("wake_word");
    expect(getCurrentClient().dispose).toHaveBeenCalledOnce();
    expect(voiceChatMocks.wakeWordManager.resume).toHaveBeenCalledOnce();
    expect(result.current.connectionState).toBe("disconnected");
  });

  it("returns to wake-word mode after the inactivity timeout fires", async () => {
    const { result } = renderHook(() => useVoiceChat());

    act(() => {
      result.current.startListening();
    });

    await triggerWakeWord("Jarvis");
    await flushAsync();

    expect(result.current.connectionState).toBe("connected");
    act(() => {
      getCurrentClient().__options.onTurnComplete();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    await flushAsync();

    expect(result.current.listeningMode).toBe("wake_word");
    expect(getCurrentClient().dispose).toHaveBeenCalledOnce();
    expect(voiceChatMocks.wakeWordManager.resume).toHaveBeenCalledOnce();
    expect(result.current.connectionState).toBe("disconnected");
  });

  it("deletes the current chat and reconnects with a fresh session", async () => {
    voiceChatMocks.createChat
      .mockResolvedValueOnce({
        success: true,
        chat: buildChat("chat-1"),
      })
      .mockResolvedValueOnce({
        success: true,
        chat: buildChat("chat-2"),
      });

    const { result } = renderHook(() => useVoiceChat());

    act(() => {
      result.current.startListening();
    });

    await triggerWakeWord("Jarvis");
    await flushAsync();

    expect(result.current.chatId).toBe("chat-1");
    act(() => {
      result.current.deleteChat();
    });
    await flushAsync();

    expect(voiceChatMocks.deleteChatById).toHaveBeenCalledWith("chat-1");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    await flushAsync();

    expect(result.current.chatId).toBe("chat-2");
    expect(voiceChatMocks.clients).toHaveLength(2);
    expect(voiceChatMocks.clients[0]?.dispose).toHaveBeenCalledOnce();
    expect(voiceChatMocks.clients[1]?.sendText).toHaveBeenCalledWith("Ciao Jarvis");
    expect(result.current.messages).toEqual([
      expect.objectContaining({
        text: "Ciao Jarvis",
        isUser: true,
      }),
    ]);
  });

  it("switches to another chat and can create a new empty chat from tool callbacks", async () => {
    voiceChatMocks.createChat
      .mockResolvedValueOnce({
        success: true,
        chat: buildChat("chat-1"),
      })
      .mockResolvedValueOnce({
        success: true,
        chat: buildChat("brand-new", { title: "Chat brand-new" }),
      });

    voiceChatMocks.fetchChatById
      .mockResolvedValueOnce({
        success: true,
        chat: buildHistoryChat("other-chat"),
      })
      .mockResolvedValueOnce({
        success: true,
        chat: buildHistoryChat("other-chat"),
      })
      .mockResolvedValueOnce({
        success: true,
        chat: {
          ...buildChat("brand-new", { title: "Chat brand-new" }),
          full_history: [],
          assistant_history: [],
        },
      });

    const { result } = renderHook(() => useVoiceChat());

    act(() => {
      result.current.startListening();
    });

    await triggerWakeWord("Jarvis");
    await flushAsync();

    let switchResult: { success: boolean; error?: string } | undefined;

    await act(async () => {
      switchResult = (await getCurrentClient().__options.onSwitchToChat("other-chat")) as {
        success: boolean;
        error?: string;
      };
    });

    expect(switchResult).toEqual({ success: true });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    await flushAsync();

    expect(result.current.chatId).toBe("other-chat");
    expect(voiceChatMocks.wakeWordManager.resume).toHaveBeenCalled();
    expect(voiceChatMocks.clients).toHaveLength(2);

    act(() => {
      getCurrentClient().__options.onCreateNewChat();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    await flushAsync();

    expect(result.current.chatId).toBe("brand-new");
    expect(voiceChatMocks.createChat).toHaveBeenCalledWith([]);
    expect(result.current.messages).toEqual([]);
  });

  it("surfaces wake-word and connection failures as voice chat errors", async () => {
    const { VoiceChatError } = await import("@/app/_features/assistant/lib");
    const { result } = renderHook(() => useVoiceChat());

    act(() => {
      result.current.startListening();
    });

    act(() => {
      voiceChatMocks.wakeWordOptions?.onError(
        new VoiceChatError("wake failed", "UNKNOWN_ERROR", false),
      );
    });

    expect(result.current.error?.message).toBe("wake failed");

    voiceChatMocks.connectImpl.mockImplementationOnce(async () => {
      throw new Error("socket offline");
    });

    await triggerWakeWord("Jarvis");
    await flushAsync();

    expect(result.current.error?.message).toBe("socket offline");
    expect(result.current.listeningMode).toBe("wake_word");
    expect(voiceChatMocks.wakeWordManager.resume).toHaveBeenCalled();
  });
});
