// used the fkg testing skill zioo
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionConfig } from "../../../types/messages.types";

const buildSetupMessage = vi.fn((config) => ({ setup: config }));
const buildAudioMessage = vi.fn(() => ({ type: "audio" }));
const buildActivityStartMessage = vi.fn(() => ({ type: "activityStart" }));
const buildActivityEndMessage = vi.fn(() => ({ type: "activityEnd" }));
const buildToolResponseMessage = vi.fn((responses) => ({ toolResponse: responses }));
const buildHistoryMessage = vi.fn((turns, turnComplete) => ({
  clientContent: { turns, turnComplete },
}));
const parseServerMessage = vi.fn((data: string) => JSON.parse(data));
const sessionConfig: SessionConfig = {
  model: "models/test",
  generationConfig: {
    responseModalities: ["AUDIO"],
  },
};

class MockWebSocket {
  static readonly OPEN = 1;

  readonly sent: string[] = [];
  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent | { data: string | Blob }) => void | Promise<void>) | null =
    null;
  onerror: ((event: Event) => void) | null = null;
  onclose:
    | ((event: CloseEvent | { code: number; reason: string; wasClean: boolean }) => void)
    | null = null;

  constructor(readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  static instances: MockWebSocket[] = [];

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
    this.onclose?.({ code: 1000, reason: "", wasClean: true });
  }
}

describe("GeminiProvider", () => {
  beforeEach(() => {
    vi.resetModules();
    MockWebSocket.instances = [];
    vi.doMock("./gemini-messages", () => ({
      buildSetupMessage,
      buildAudioMessage,
      buildActivityStartMessage,
      buildActivityEndMessage,
      buildToolResponseMessage,
      buildHistoryMessage,
      parseServerMessage,
    }));
    vi.stubGlobal("WebSocket", MockWebSocket as unknown as typeof WebSocket);
    vi.stubGlobal("atob", (value: string) => Buffer.from(value, "base64").toString("binary"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("connects over WebSocket, sends setup and forwards server events", async () => {
    const { GeminiProvider } = await import("./gemini.provider");
    const provider = new GeminiProvider();
    const onConnected = vi.fn();
    const onTranscript = vi.fn();
    const onAudio = vi.fn();
    const onToolCall = vi.fn();
    const onTurnComplete = vi.fn();
    const onInterrupted = vi.fn();

    provider.on("connected", onConnected);
    provider.on("transcript", onTranscript);
    provider.on("audio", onAudio);
    provider.on("toolCall", onToolCall);
    provider.on("turnComplete", onTurnComplete);
    provider.on("interrupted", onInterrupted);

    const connectPromise = provider.connect(sessionConfig, "secret");
    const ws = MockWebSocket.instances[0];
    expect(ws.url).toContain("key=secret");

    ws.onopen?.();
    expect(buildSetupMessage).toHaveBeenCalledWith(sessionConfig);
    expect(ws.sent[0]).toBe(JSON.stringify({ setup: sessionConfig }));

    await ws.onmessage?.({
      data: new Blob([JSON.stringify({ setupComplete: true })]),
    });
    await connectPromise;

    await ws.onmessage?.({
      data: JSON.stringify({
        serverContent: {
          modelTurn: {
            parts: [
              {
                inlineData: {
                  data: Buffer.from([1, 2, 3]).toString("base64"),
                },
              },
              { text: "<ctrl46>thinking", thought: true },
            ],
          },
          inputTranscription: { text: "<ctrl21>ciao" },
          outputTranscription: { text: "salveeeeeee" },
          turnComplete: true,
          interrupted: true,
        },
        toolCall: {
          functionCalls: [{ id: "1", name: "tool", args: {} }],
        },
      }),
    });

    expect(onConnected).toHaveBeenCalledOnce();
    expect(onAudio).toHaveBeenCalledWith({ data: expect.any(ArrayBuffer) });
    expect(onTranscript).toHaveBeenCalledWith({ text: "thinking", type: "thinking" });
    expect(onTranscript).toHaveBeenCalledWith({ text: "ciao", type: "input" });
    expect(onTranscript).toHaveBeenCalledWith({ text: "salv", type: "output" });
    expect(onToolCall).toHaveBeenCalledWith({
      calls: [{ id: "1", name: "tool", args: {} }],
    });
    expect(onTurnComplete).toHaveBeenCalledOnce();
    expect(onInterrupted).toHaveBeenCalledOnce();
  });

  it("sends audio, text, activity, tool responses and history only when the socket is open", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { GeminiProvider } = await import("./gemini.provider");
    const provider = new GeminiProvider();

    const connectPromise = provider.connect(sessionConfig, "secret");
    const ws = MockWebSocket.instances[0];
    ws.onopen?.();
    await ws.onmessage?.({ data: JSON.stringify({ setupComplete: true }) });
    await connectPromise;

    ws.sent.length = 0;

    provider.sendAudio(new ArrayBuffer(2));
    provider.sendText("ciao");
    provider.sendActivityStart();
    provider.sendActivityEnd();
    provider.sendToolResponse([{ id: "1", name: "tool", response: { result: "{}" } }]);
    provider.sendHistory([{ role: "user", parts: [{ text: "storia" }] }], true);

    expect(ws.sent).toEqual([
      JSON.stringify({ type: "audio" }),
      JSON.stringify({
        clientContent: {
          turns: [{ role: "user", parts: [{ text: "ciao" }] }],
          turnComplete: true,
        },
      }),
      JSON.stringify({ type: "activityStart" }),
      JSON.stringify({ type: "activityEnd" }),
      JSON.stringify({
        toolResponse: [{ id: "1", name: "tool", response: { result: "{}" } }],
      }),
      JSON.stringify({
        clientContent: {
          turns: [{ role: "user", parts: [{ text: "storia" }] }],
          turnComplete: true,
        },
      }),
    ]);

    ws.readyState = 0;
    provider.sendToolResponse([{ id: "2", name: "tool", response: { result: "{}" } }]);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("maps WebSocket errors and close events into VoiceChatError instances", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    const { GeminiProvider } = await import("./gemini.provider");
    const provider = new GeminiProvider();
    const onError = vi.fn();
    const onDisconnected = vi.fn();

    provider.on("error", onError);
    provider.on("disconnected", onDisconnected);

    const failingConnect = provider.connect(sessionConfig, "secret");
    const firstSocket = MockWebSocket.instances[0];
    firstSocket.onerror?.(new Event("error"));
    await expect(failingConnect).rejects.toMatchObject({
      message: "WebSocket connection failed",
      code: "CONNECTION_FAILED",
    });

    const successfulConnect = provider.connect(sessionConfig, "secret");
    const secondSocket = MockWebSocket.instances[1];
    secondSocket.onopen?.();
    await secondSocket.onmessage?.({ data: JSON.stringify({ setupComplete: true }) });
    await successfulConnect;

    secondSocket.onclose?.({
      code: 1008,
      reason: "not supported",
      wasClean: false,
    });

    expect(onDisconnected).toHaveBeenLastCalledWith({ reason: "not supported" });
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "CONNECTION_FAILED",
          recoverable: true,
        }),
      }),
    );
  });

  it("can unregister listeners, disconnect and dispose safely", async () => {
    const { GeminiProvider } = await import("./gemini.provider");
    const provider = new GeminiProvider();
    const handler = vi.fn();

    provider.on("transcript", handler);
    provider.off("transcript", handler);

    const connectPromise = provider.connect(sessionConfig, "secret");
    const ws = MockWebSocket.instances[0];
    ws.onopen?.();
    await ws.onmessage?.({ data: JSON.stringify({ setupComplete: true }) });
    await connectPromise;

    provider.disconnect();
    expect(ws.readyState).toBe(3);

    provider.dispose();
    await ws.onmessage?.({
      data: JSON.stringify({
        serverContent: { inputTranscription: { text: "nessuno" } },
      }),
    });

    expect(handler).not.toHaveBeenCalled();
  });
});
