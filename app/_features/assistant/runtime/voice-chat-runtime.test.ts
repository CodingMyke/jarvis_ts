import { VoiceChatError } from "@/app/_features/assistant/lib";
import type { ConversationTurn } from "@/app/_features/assistant/lib";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createVoiceChatRuntime } from "../lib";
import { createVoiceChatChatManager } from "./voice-chat-chat-manager";
import { createVoiceChatRuntimeStore } from "./voice-chat-runtime.store";
import type { VoiceChatRuntimeDependencies } from "./voice-chat-runtime.types";

function buildTurn(role: "user" | "model", text: string, thinking?: string): ConversationTurn {
  return {
    role,
    parts: [{ text }],
    thinking,
  };
}

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
      buildTurn("user", "Ciao"),
      buildTurn("model", "Bentornato", "Sto recuperando il contesto"),
    ],
    assistant_history: [buildTurn("model", "Riassunto compatto")],
  };
}

type MockTransport = {
  callbacks: Record<string, (...args: unknown[]) => unknown>;
  connect: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  sendHistory: ReturnType<typeof vi.fn>;
  sendText: ReturnType<typeof vi.fn>;
  setMuted: ReturnType<typeof vi.fn>;
  startListening: ReturnType<typeof vi.fn>;
};

type RuntimeDeps = {
  appendChatTurns: ReturnType<typeof vi.fn>;
  connectImpl: ReturnType<typeof vi.fn>;
  createChat: ReturnType<typeof vi.fn>;
  createTransport: ReturnType<typeof vi.fn>;
  createWakeWord: ReturnType<typeof vi.fn>;
  deleteChatById: ReturnType<typeof vi.fn>;
  emitWakeWord(transcript: string): Promise<void>;
  fetchChatById: ReturnType<typeof vi.fn>;
  initialChatId: string | null;
  transports: MockTransport[];
  wakeWordManager: {
    dispose: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
  };
  wakeWordOptions(): {
    onError: (error: VoiceChatError) => void;
    onWakeWord: (transcript: string) => Promise<void>;
  } | null;
};

function createRuntimeDeps(overrides?: Partial<RuntimeDeps>): RuntimeDeps {
  const transports: MockTransport[] = [];
  const appendChatTurns = vi.fn().mockResolvedValue({
    chat: buildChat("chat-1", { title: "Chat aggiornata" }),
  });
  const createChat = vi
    .fn()
    .mockResolvedValue({
      success: true,
      chat: buildChat("chat-1"),
    });
  const deleteChatById = vi.fn().mockResolvedValue({ ok: true, message: null });
  const fetchChatById = vi.fn().mockResolvedValue(null);
  const wakeWordManager = {
    dispose: vi.fn(),
    resume: vi.fn(),
  };
  const connectImpl = vi.fn(async (callbacks: Record<string, (...args: unknown[]) => unknown>) => {
    callbacks.onStateChange("connecting");
    callbacks.onStateChange("connected");
  });

  let wakeWordOptions: {
    onError: (error: VoiceChatError) => void;
    onWakeWord: (transcript: string) => Promise<void>;
  } | null = null;

  const createTransport = vi.fn((callbacks: Record<string, (...args: unknown[]) => unknown>) => {
    const transport: MockTransport = {
      callbacks,
      connect: vi.fn(async () => {
        await connectImpl(callbacks);
      }),
      dispose: vi.fn(),
      sendHistory: vi.fn(),
      sendText: vi.fn(),
      setMuted: vi.fn(),
      startListening: vi.fn(async () => undefined),
    };

    transports.push(transport);
    return transport;
  });

  const createWakeWord = vi.fn((options) => {
    wakeWordOptions = options;
    return wakeWordManager;
  });

  return {
    appendChatTurns,
    connectImpl,
    createChat,
    createTransport,
    createWakeWord,
    deleteChatById,
    emitWakeWord: async (transcript: string) => {
      await wakeWordOptions?.onWakeWord(transcript);
    },
    fetchChatById,
    initialChatId: null as string | null,
    transports,
    wakeWordManager,
    wakeWordOptions: () => wakeWordOptions,
    ...overrides,
  };
}

describe("createVoiceChatRuntime", () => {
  it("exposes the initial public contract with the default snapshot", async () => {
    const runtime = createVoiceChatRuntime();

    expect(runtime.getSnapshot()).toEqual({
      connectionState: "disconnected",
      listeningMode: "idle",
      isMuted: false,
      messages: [],
      audioLevel: 0,
      outputAudioLevel: 0,
      error: null,
      chatId: null,
      chatTitle: null,
    });

    expect(runtime.subscribe).toEqual(expect.any(Function));
    expect(runtime.subscribeToolExecuted).toEqual(expect.any(Function));
    expect(runtime.startListening).toEqual(expect.any(Function));
    expect(runtime.stopListening).toEqual(expect.any(Function));
    expect(runtime.toggleMute).toEqual(expect.any(Function));
    expect(runtime.deleteCurrentChat).toEqual(expect.any(Function));
    expect(runtime.dispose).toEqual(expect.any(Function));

    const unsubscribe = runtime.subscribe(() => undefined);
    const unsubscribeToolExecuted = runtime.subscribeToolExecuted(() => undefined);

    expect(unsubscribe).toEqual(expect.any(Function));
    expect(unsubscribeToolExecuted).toEqual(expect.any(Function));
    await expect(runtime.deleteCurrentChat()).resolves.toBeUndefined();
  });
});

describe("voice chat runtime chat manager", () => {
  const fetchChatById = vi.fn();
  const appendChatTurns = vi.fn();
  const createChat = vi.fn();
  const deleteChatById = vi.fn();

  beforeEach(() => {
    fetchChatById.mockReset();
    appendChatTurns.mockReset();
    createChat.mockReset();
    deleteChatById.mockReset();
  });

  it("loads full_history for UI and assistant_history for model seeding", async () => {
    fetchChatById.mockResolvedValue({
      success: true,
      chat: {
        title: "Stored chat",
        full_history: [
          buildTurn("user", "Hello there"),
          buildTurn("model", "Welcome back", "Rebuilding context"),
        ],
        assistant_history: [buildTurn("model", "Compact summary")],
      },
    });

    const store = createVoiceChatRuntimeStore();
    const manager = createVoiceChatChatManager({
      store,
      fetchChatById,
      appendChatTurns,
      createChat,
      deleteChatById,
    });

    const assistantHistory = await manager.loadChat("seed-chat");

    expect(fetchChatById).toHaveBeenCalledWith("seed-chat");
    expect(store.getSnapshot()).toMatchObject({
      chatId: "seed-chat",
      chatTitle: "Stored chat",
      messages: [
        { id: "history-0", text: "Hello there", isUser: true },
        {
          id: "history-1",
          text: "Welcome back",
          isUser: false,
          thinking: "Rebuilding context",
        },
      ],
    });
    expect(store.getLastSavedTurnCount()).toBe(2);
    expect(assistantHistory).toEqual([buildTurn("model", "Compact summary")]);
    expect(store.getAssistantHistory()).toEqual([buildTurn("model", "Compact summary")]);
  });

  it("uses lastSavedTurnCount to persist only the unsaved delta", async () => {
    const store = createVoiceChatRuntimeStore();
    store.setChatStateFromHistory("chat-1", {
      title: "Stored chat",
      full_history: [
        buildTurn("user", "Hello"),
        buildTurn("model", "Hi"),
      ],
      assistant_history: [buildTurn("model", "Summary")],
    });
    store.setMessages([
      { id: "1", text: "Hello", isUser: true },
      { id: "2", text: "Hi", isUser: false },
      { id: "3", text: "What time is it?", isUser: true },
      { id: "4", text: "It is noon.", isUser: false },
    ]);

    appendChatTurns.mockResolvedValue({
      chat: {
        id: "chat-1",
        title: "Stored chat",
      },
    });

    const manager = createVoiceChatChatManager({
      store,
      fetchChatById,
      appendChatTurns,
      createChat,
      deleteChatById,
    });

    await manager.persistCurrentMessages();

    expect(appendChatTurns).toHaveBeenCalledWith("chat-1", [
      buildTurn("user", "What time is it?"),
      buildTurn("model", "It is noon."),
    ]);
    expect(store.getLastSavedTurnCount()).toBe(4);
  });

  it("deleting the current chat clears runtime chat and message state", async () => {
    const store = createVoiceChatRuntimeStore();
    store.setChatStateFromHistory("chat-1", {
      title: "To delete",
      full_history: [buildTurn("user", "Delete me")],
      assistant_history: [buildTurn("model", "Summary")],
    });

    deleteChatById.mockResolvedValue({ ok: true });

    const manager = createVoiceChatChatManager({
      store,
      fetchChatById,
      appendChatTurns,
      createChat,
      deleteChatById,
    });

    await expect(manager.deleteCurrentChat()).resolves.toEqual({ success: true });
    expect(store.getSnapshot()).toMatchObject({
      chatId: null,
      chatTitle: null,
      messages: [],
    });
    expect(store.getAssistantHistory()).toEqual([]);
    expect(store.getLastSavedTurnCount()).toBe(0);
  });

  it("deletes an arbitrary chat without clearing the current runtime state", async () => {
    const store = createVoiceChatRuntimeStore();
    store.setChatStateFromHistory("chat-1", {
      title: "Current chat",
      full_history: [buildTurn("user", "Keep me")],
      assistant_history: [buildTurn("model", "Summary")],
    });

    deleteChatById.mockResolvedValue({ ok: true });

    const manager = createVoiceChatChatManager({
      store,
      fetchChatById,
      appendChatTurns,
      createChat,
      deleteChatById,
    });

    await expect(manager.deleteChatById("chat-2")).resolves.toEqual({ success: true });
    expect(deleteChatById).toHaveBeenCalledWith("chat-2");
    expect(store.getSnapshot()).toMatchObject({
      chatId: "chat-1",
      chatTitle: "Current chat",
      messages: [{ id: "history-0", text: "Keep me", isUser: true }],
    });
  });

  it("preparing a chat switch resets current messages and metadata", () => {
    const store = createVoiceChatRuntimeStore();
    store.setChatStateFromHistory("chat-1", {
      title: "Current chat",
      created_at: "2026-05-10T10:00:00.000Z",
      last_activity_at: "2026-05-10T10:05:00.000Z",
      full_history: [buildTurn("user", "Keep?")],
      assistant_history: [buildTurn("model", "Summary")],
    });

    const manager = createVoiceChatChatManager({
      store,
      fetchChatById,
      appendChatTurns,
      createChat,
      deleteChatById,
    });

    manager.prepareChatSwitch("chat-2");

    expect(store.getSnapshot()).toMatchObject({
      chatId: "chat-2",
      chatTitle: null,
      messages: [],
    });
    expect(store.getAssistantHistory()).toEqual([]);
    expect(store.getLastSavedTurnCount()).toBe(0);
    expect(store.getChatMetadata()).toEqual({
      createdAt: null,
      lastActivityAt: null,
    });
  });

  it("creating a new chat does not keep the command turn in saved history", async () => {
    const store = createVoiceChatRuntimeStore();
    store.setChatId("chat-1");
    store.setMessages([
      { id: "1", text: "Previous question", isUser: true },
      { id: "2", text: "Previous answer", isUser: false },
      { id: "3", text: "Create a new chat", isUser: true },
    ]);

    appendChatTurns.mockResolvedValue({
      chat: {
        id: "chat-1",
        title: "Old chat",
      },
    });
    createChat.mockResolvedValue({
      success: true,
      chat: {
        id: "chat-2",
        title: "Fresh chat",
      },
    });

    const manager = createVoiceChatChatManager({
      store,
      fetchChatById,
      appendChatTurns,
      createChat,
      deleteChatById,
    });

    await expect(manager.createNewChat()).resolves.toEqual({ success: true, chatId: "chat-2" });

    expect(appendChatTurns).toHaveBeenCalledWith("chat-1", [
      buildTurn("user", "Previous question"),
      buildTurn("model", "Previous answer"),
    ]);
    expect(createChat).toHaveBeenCalledWith([]);
    expect(store.getSnapshot()).toMatchObject({
      chatId: "chat-2",
      chatTitle: "Fresh chat",
      messages: [],
    });
    expect(store.getLastSavedTurnCount()).toBe(0);
  });
});

describe("voice chat runtime store", () => {
  it("updates non-chat snapshot fields through deterministic mutation methods", () => {
    const store = createVoiceChatRuntimeStore();
    const error = new VoiceChatError("boom", "UNKNOWN_ERROR", false);

    store.setConnectionState("connected");
    store.setListeningMode("wake_word");
    store.setMuted(true);
    store.setAudioLevel(0.5);
    store.setOutputAudioLevel(0.75);
    store.setError(error);

    expect(store.getSnapshot()).toMatchObject({
      connectionState: "connected",
      listeningMode: "wake_word",
      isMuted: true,
      audioLevel: 0.5,
      outputAudioLevel: 0.75,
      error,
    });
  });
});

describe("voice chat runtime session flow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T09:30:00.000Z"));
  });

  it("starts in wake-word mode, connects on wake word, appends transcripts and saves on stop", async () => {
    const deps = createRuntimeDeps();
    const runtime = createVoiceChatRuntime(deps as unknown as VoiceChatRuntimeDependencies);

    runtime.startListening();

    expect(runtime.getSnapshot().listeningMode).toBe("wake_word");
    expect(deps.createWakeWord).toHaveBeenCalledWith(
      expect.objectContaining({
        keyword: "Jarvis",
        language: "it-IT",
      }),
    );

    await deps.emitWakeWord("Jarvis");

    expect(runtime.getSnapshot().connectionState).toBe("connected");
    expect(deps.transports[0]?.sendText).toHaveBeenCalledWith("Jarvis");
    expect(runtime.getSnapshot().chatId).toBe("chat-1");
    expect(runtime.getSnapshot().chatTitle).toBe("Chat chat-1");

    const baseTime = Date.now();

    vi.setSystemTime(new Date(baseTime + 1));
    deps.transports[0]?.callbacks.onTranscript("Ciao ", "input");
    deps.transports[0]?.callbacks.onTranscript("mondo", "input");
    vi.setSystemTime(new Date(baseTime + 2));
    deps.transports[0]?.callbacks.onTranscript("Salve", "output");
    deps.transports[0]?.callbacks.onTranscript("!", "output");

    expect(runtime.getSnapshot().messages.map((message) => message.text)).toEqual([
      "Jarvis",
      "Ciao mondo",
      "Salve!",
    ]);

    runtime.toggleMute();

    expect(deps.transports[0]?.setMuted).toHaveBeenCalledWith(true);
    expect(runtime.getSnapshot().isMuted).toBe(true);

    runtime.stopListening();
    await Promise.resolve();
    await Promise.resolve();

    expect(deps.appendChatTurns).toHaveBeenCalledWith("chat-1", expect.any(Array));
    expect(deps.transports[0]?.dispose).toHaveBeenCalledOnce();
    expect(deps.wakeWordManager.dispose).toHaveBeenCalledOnce();
    expect(runtime.getSnapshot().connectionState).toBe("disconnected");
    expect(runtime.getSnapshot().listeningMode).toBe("idle");
  });

  it("preloads an existing chat, sends assistant history and resumes wake-word mode on disconnect", async () => {
    const deps = createRuntimeDeps({
      fetchChatById: vi.fn().mockResolvedValue({
        success: true,
        chat: buildHistoryChat("seed-chat"),
      }),
      initialChatId: "seed-chat",
    });
    const runtime = createVoiceChatRuntime(deps as unknown as VoiceChatRuntimeDependencies);

    runtime.startListening();
    await deps.emitWakeWord("Jarvis riprendi");

    expect(runtime.getSnapshot().chatTitle).toBe("Storica");
    expect(deps.transports[0]?.sendHistory).toHaveBeenCalledWith(
      [buildTurn("model", "Riassunto compatto")],
      false,
    );
    expect(runtime.getSnapshot().messages[0]).toMatchObject({
      text: "Ciao",
      isUser: true,
    });
    expect(runtime.getSnapshot().messages[1]).toMatchObject({
      text: "Bentornato",
      thinking: "Sto recuperando il contesto",
      isUser: false,
    });

    deps.transports[0]?.callbacks.onStateChange("disconnected");
    await Promise.resolve();
    await Promise.resolve();

    expect(runtime.getSnapshot().listeningMode).toBe("wake_word");
    expect(deps.transports[0]?.dispose).toHaveBeenCalledOnce();
    expect(deps.wakeWordManager.resume).toHaveBeenCalledOnce();
    expect(runtime.getSnapshot().connectionState).toBe("disconnected");
  });

  it("returns to wake-word mode after the inactivity timeout fires", async () => {
    const deps = createRuntimeDeps();
    const runtime = createVoiceChatRuntime(deps as unknown as VoiceChatRuntimeDependencies);

    runtime.startListening();
    await deps.emitWakeWord("Jarvis");

    expect(runtime.getSnapshot().connectionState).toBe("connected");
    deps.transports[0]?.callbacks.onTurnComplete();

    await vi.advanceTimersByTimeAsync(20_000);
    await Promise.resolve();
    await Promise.resolve();

    expect(runtime.getSnapshot().listeningMode).toBe("wake_word");
    expect(deps.transports[0]?.dispose).toHaveBeenCalledOnce();
    expect(deps.wakeWordManager.resume).toHaveBeenCalledOnce();
    expect(runtime.getSnapshot().connectionState).toBe("disconnected");
  });

  it("deletes the current chat and reconnects with a fresh session", async () => {
    const deps = createRuntimeDeps({
      createChat: vi
        .fn()
        .mockResolvedValueOnce({
          success: true,
          chat: buildChat("chat-1"),
        })
        .mockResolvedValueOnce({
          success: true,
          chat: buildChat("chat-2"),
        }),
    });
    const runtime = createVoiceChatRuntime(deps as unknown as VoiceChatRuntimeDependencies);

    runtime.startListening();
    await deps.emitWakeWord("Jarvis");

    expect(runtime.getSnapshot().chatId).toBe("chat-1");
    runtime.deleteCurrentChat();
    await Promise.resolve();
    await Promise.resolve();

    expect(deps.deleteChatById).toHaveBeenCalledWith("chat-1");

    await vi.advanceTimersByTimeAsync(800);
    await Promise.resolve();
    await Promise.resolve();

    expect(runtime.getSnapshot().chatId).toBe("chat-2");
    expect(deps.transports).toHaveLength(2);
    expect(deps.transports[0]?.dispose).toHaveBeenCalledOnce();
    expect(deps.transports[1]?.sendText).toHaveBeenCalledWith("Ciao Jarvis");
    expect(runtime.getSnapshot().messages).toEqual([
      expect.objectContaining({
        text: "Ciao Jarvis",
        isUser: true,
      }),
    ]);
  });

  it("surfaces wake-word and connection failures as runtime errors", async () => {
    const deps = createRuntimeDeps();
    const runtime = createVoiceChatRuntime(deps as unknown as VoiceChatRuntimeDependencies);
    const { VoiceChatError } = await import("@/app/_features/assistant/lib");

    runtime.startListening();

    deps.wakeWordOptions()?.onError(new VoiceChatError("wake failed", "UNKNOWN_ERROR", false));

    expect(runtime.getSnapshot().error?.message).toBe("wake failed");

    deps.connectImpl.mockImplementationOnce(async () => {
      throw new Error("socket offline");
    });

    await deps.emitWakeWord("Jarvis");
    await Promise.resolve();
    await Promise.resolve();

    expect(runtime.getSnapshot().error?.message).toBe("socket offline");
    expect(runtime.getSnapshot().listeningMode).toBe("wake_word");
    expect(deps.wakeWordManager.resume).toHaveBeenCalled();
  });
});
