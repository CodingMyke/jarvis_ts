// used the fkg testing skill zioo
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("wake-word lifecycle", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts the wake-word manager and wraps errors as VoiceChatError", async () => {
    const start = vi.fn();
    const dispose = vi.fn();
    let managerOptions:
      | {
          keyword: string;
          language: string;
          onWakeWord: (transcript: string) => void;
          onError: (error: Error) => void;
        }
      | undefined;

    vi.doMock("./audio/wake-word.manager", () => ({
      WakeWordManager: class MockWakeWordManager {
        constructor(options: typeof managerOptions) {
          managerOptions = options;
        }

        start = start;
        dispose = dispose;
      },
    }));

    const { startWakeWordLifecycle, stopWakeWordLifecycle } = await import(
      "./wake-word-lifecycle"
    );

    const onWakeWord = vi.fn();
    const onError = vi.fn();
    const manager = startWakeWordLifecycle({
      keyword: "jarvis",
      language: "it-IT",
      onWakeWord,
      onError,
    });

    expect(start).toHaveBeenCalledOnce();
    expect(managerOptions).toMatchObject({
      keyword: "jarvis",
      language: "it-IT",
      onWakeWord,
    });

    managerOptions?.onWakeWord("jarvis");
    expect(onWakeWord).toHaveBeenCalledWith("jarvis");

    managerOptions?.onError(new Error("microfono occupato"));
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "microfono occupato",
        code: "AUDIO_ERROR",
        recoverable: true,
      }),
    );

    stopWakeWordLifecycle(manager);
    stopWakeWordLifecycle(null);
    expect(dispose).toHaveBeenCalledOnce();
  });
});
