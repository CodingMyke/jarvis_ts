// used the fkg testing skill zioo
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ProviderHandlers = Record<string, (payload: unknown) => void>;

function createMockProvider() {
  const handlers: ProviderHandlers = {};

  return {
    handlers,
    provider: {
      name: "mock-provider",
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      sendAudio: vi.fn(),
      sendText: vi.fn(),
      sendActivityStart: vi.fn(),
      sendActivityEnd: vi.fn(),
      sendToolResponse: vi.fn(),
      sendHistory: vi.fn(),
      dispose: vi.fn(),
      on: vi.fn((event: string, handler: (payload: unknown) => void) => {
        handlers[event] = handler;
      }),
      off: vi.fn(),
    },
  };
}

describe("GeminiLiveClient", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("connects, builds the session config and forwards provider events", async () => {
    vi.useFakeTimers();

    const dispatchToolCalls = vi.fn();
    const playChunk = vi.fn();
    const flush = vi.fn();
    const clear = vi.fn();
    const outputDispose = vi.fn();
    const MockAudioInputManager = class {};
    const MockAudioOutputManager = class {
      constructor(readonly options: Record<string, unknown>) {}

      playChunk = playChunk;
      flush = flush;
      clear = clear;
      dispose = outputDispose;
    };

    vi.doMock("../audio/audio-input.manager", () => ({
      AudioInputManager: MockAudioInputManager,
    }));
    vi.doMock("../audio/audio-output.manager", () => ({
      AudioOutputManager: MockAudioOutputManager,
    }));
    vi.doMock("./tool-dispatcher", () => ({
      dispatchToolCalls,
    }));

    vi.stubEnv("NEXT_PUBLIC_GEMINI_API_KEY", "public-key");

    const { provider, handlers } = createMockProvider();
    const { GeminiLiveClient } = await import("./gemini-live-client");

    const onStateChange = vi.fn();
    const onTranscript = vi.fn();
    const onTurnComplete = vi.fn();
    const onError = vi.fn();
    const onToolExecuted = vi.fn();
    const onEndConversation = vi.fn();
    const onDisableCompletely = vi.fn();
    const onDeleteCurrentChat = vi.fn().mockResolvedValue({ success: true });
    const onDeleteChatById = vi.fn().mockResolvedValue({ success: true });
    const onSwitchToChat = vi.fn().mockResolvedValue({ success: true });
    const onCreateNewChat = vi.fn();

    const client = new GeminiLiveClient({
      provider,
      config: {
        systemPrompt: "System prompt",
        voice: "Kore",
      },
      tools: [
        {
          name: "userTool",
          description: "User tool",
          parameters: {
            type: "object",
            properties: {},
          },
          execute: vi.fn().mockResolvedValue({ ok: true }),
        },
      ],
      onStateChange,
      onTranscript,
      onTurnComplete,
      onError,
      onToolExecuted,
      onEndConversation,
      onDisableCompletely,
      onDeleteCurrentChat,
      onDeleteChatById,
      onSwitchToChat,
      onCreateNewChat,
      getIsCurrentChatEmpty: () => true,
      getCurrentChatContext: () => ({
        id: "chat-1",
        title: "Chat corrente",
        created_at: "2026-03-15T09:00:00.000Z",
        last_activity_at: "2026-03-15T10:00:00.000Z",
      }),
    });

    await client.connect();

    expect(onStateChange).toHaveBeenNthCalledWith(1, "connecting");
    expect(onStateChange).toHaveBeenNthCalledWith(2, "connected");
    expect(provider.connect).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.stringContaining("models/"),
        generationConfig: expect.objectContaining({
          responseModalities: ["AUDIO"],
        }),
        systemInstruction: {
          parts: [
            {
              text: expect.stringContaining("CONVERSAZIONE CORRENTE"),
            },
          ],
        },
        tools: [
          {
            functionDeclarations: expect.arrayContaining([
              expect.objectContaining({ name: "userTool" }),
            ]),
          },
        ],
      }),
      "public-key",
    );

    handlers.transcript?.({ text: "Ciao", type: "output" });
    handlers.audio?.({ data: new ArrayBuffer(4) });
    handlers.turnComplete?.(undefined);
    handlers.interrupted?.(undefined);
    handlers.toolCall?.({ calls: [{ id: "1", name: "userTool", args: {} }] });
    handlers.error?.({
      error: { message: "provider error", code: "API_ERROR", recoverable: false },
    });
    handlers.disconnected?.({ reason: "bye" });

    expect(onTranscript).toHaveBeenCalledWith("Ciao", "output");
    expect(playChunk).toHaveBeenCalled();
    expect(flush).toHaveBeenCalledOnce();
    expect(clear).toHaveBeenCalledOnce();
    expect(onTurnComplete).toHaveBeenCalledOnce();
    expect(dispatchToolCalls).toHaveBeenCalledWith(
      expect.objectContaining({
        calls: [{ id: "1", name: "userTool", args: {} }],
        onToolExecuted,
        onError,
        sendToolResponses: expect.any(Function),
      }),
    );
    expect(onError).toHaveBeenCalledWith({
      message: "provider error",
      code: "API_ERROR",
      recoverable: false,
    });
    expect(onStateChange).toHaveBeenLastCalledWith("disconnected");

    const toolDispatchOptions = dispatchToolCalls.mock.calls[0]?.[0];
    toolDispatchOptions.sendToolResponses([{ id: "1", name: "userTool", response: { result: "{}" } }]);
    toolDispatchOptions.context.endConversation(25);
    toolDispatchOptions.context.disableCompletely(10);
    await toolDispatchOptions.context.deleteCurrentChat();
    await toolDispatchOptions.context.deleteChatById("chat-2");
    await toolDispatchOptions.context.switchToChat("chat-3");
    toolDispatchOptions.context.createNewChat();
    expect(toolDispatchOptions.context.getIsCurrentChatEmpty()).toBe(true);

    vi.advanceTimersByTime(25);

    expect(provider.sendToolResponse).toHaveBeenCalledWith([
      { id: "1", name: "userTool", response: { result: "{}" } },
    ]);
    expect(onDeleteCurrentChat).toHaveBeenCalledOnce();
    expect(onDeleteChatById).toHaveBeenCalledWith("chat-2");
    expect(onSwitchToChat).toHaveBeenCalledWith("chat-3");
    expect(onCreateNewChat).toHaveBeenCalledOnce();
    expect(onEndConversation).toHaveBeenCalledOnce();
    expect(onDisableCompletely).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });

  it("starts and stops listening, forwards audio chunks and disposes resources", async () => {
    vi.useFakeTimers();

    let inputOptions:
      | {
          onChunk: (chunk: { data: ArrayBuffer }) => void;
          onError: (error: Error) => void;
          onLevelChange: (level: number) => void;
        }
      | undefined;
    const start = vi.fn().mockResolvedValue(undefined);
    const stop = vi.fn();
    const setMuted = vi.fn();
    const inputDispose = vi.fn();
    const outputDispose = vi.fn();

    vi.doMock("../audio/audio-input.manager", () => ({
      AudioInputManager: class MockAudioInputManager {
        constructor(options: typeof inputOptions) {
          inputOptions = options;
        }

        start = start;
        stop = stop;
        setMuted = setMuted;
        dispose = inputDispose;
      },
    }));
    vi.doMock("../audio/audio-output.manager", () => ({
      AudioOutputManager: class MockAudioOutputManager {
        dispose = outputDispose;
      },
    }));
    vi.doMock("./tool-dispatcher", () => ({
      dispatchToolCalls: vi.fn(),
    }));

    vi.stubEnv("NEXT_PUBLIC_GEMINI_API_KEY", "public-key");

    const { provider } = createMockProvider();
    const { GeminiLiveClient } = await import("./gemini-live-client");

    const onAudioLevel = vi.fn();
    const onError = vi.fn();
    const client = new GeminiLiveClient({
      provider,
      onAudioLevel,
      onError,
    });

    await expect(client.startListening()).rejects.toMatchObject({
      message: "Must be connected before starting to listen",
      code: "API_ERROR",
    });

    await client.connect();
    await client.startListening();

    inputOptions?.onChunk({ data: new ArrayBuffer(8) });
    inputOptions?.onError(new Error("microfono occupato"));
    inputOptions?.onLevelChange(0.5);

    client.stopListening();
    client.setMuted(true);
    client.sendText("ciao");
    client.sendHistory([{ role: "user", parts: [{ text: "storia" }] }], true);
    client.dispose();

    expect(start).toHaveBeenCalledOnce();
    expect(provider.sendAudio).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "microfono occupato",
        code: "AUDIO_ERROR",
        recoverable: true,
      }),
    );
    expect(onAudioLevel).toHaveBeenCalledWith(0.5);
    expect(stop).toHaveBeenCalledOnce();
    expect(setMuted).toHaveBeenCalledWith(true);
    expect(provider.sendText).toHaveBeenCalledWith("ciao");
    expect(provider.sendHistory).toHaveBeenCalledWith(
      [{ role: "user", parts: [{ text: "storia" }] }],
      true,
    );
    expect(inputDispose).toHaveBeenCalledOnce();
    expect(outputDispose).toHaveBeenCalledOnce();
    expect(provider.dispose).toHaveBeenCalledOnce();
    expect(client.connectionState).toBe("disconnected");
  });

  it("fails fast when the Gemini API key is missing or the provider connect throws", async () => {
    vi.doMock("../audio/audio-input.manager", () => ({
      AudioInputManager: class MockAudioInputManager {},
    }));
    vi.doMock("../audio/audio-output.manager", () => ({
      AudioOutputManager: class MockAudioOutputManager {},
    }));
    vi.doMock("./tool-dispatcher", () => ({
      dispatchToolCalls: vi.fn(),
    }));

    const { provider } = createMockProvider();
    const { GeminiLiveClient } = await import("./gemini-live-client");

    const clientWithoutKey = new GeminiLiveClient({ provider });
    await expect(clientWithoutKey.connect()).rejects.toMatchObject({
      message: "GEMINI_API_KEY not configured",
      code: "API_ERROR",
    });

    vi.stubEnv("NEXT_PUBLIC_GEMINI_API_KEY", "public-key");
    provider.connect.mockRejectedValueOnce(new Error("connection failed"));

    const onStateChange = vi.fn();
    const client = new GeminiLiveClient({
      provider,
      onStateChange,
    });

    await expect(client.connect()).rejects.toThrow("connection failed");
    expect(onStateChange).toHaveBeenNthCalledWith(1, "connecting");
    expect(onStateChange).toHaveBeenNthCalledWith(2, "disconnected");
  });
});
