import type { ConversationTurn } from "@/app/_features/assistant/lib";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createVoiceChatRuntime } from "../lib";
import { createVoiceChatChatManager } from "./voice-chat-chat-manager";
import { createVoiceChatRuntimeStore } from "./voice-chat-runtime.store";

function buildTurn(role: "user" | "model", text: string, thinking?: string): ConversationTurn {
  return {
    role,
    parts: [{ text }],
    thinking,
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
    const error = new Error("boom");

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
