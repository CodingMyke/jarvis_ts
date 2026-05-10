import { describe, expect, it } from "vitest";
import { createVoiceChatRuntime } from "../lib";

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
