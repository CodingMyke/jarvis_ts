// used the fkg testing skill zioo
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = "";
  onresult: ((event: { resultIndex: number; results: RecognitionResultLike[] }) => void) | null =
    null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
}

interface RecognitionAlternativeLike {
  transcript: string;
}

type RecognitionResultLike = RecognitionAlternativeLike[] & { isFinal: boolean };

describe("WakeWordManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("reports missing browser support", async () => {
    vi.stubGlobal("window", {});

    const { WakeWordManager } = await import("./wake-word.manager");
    const onError = vi.fn();
    const manager = new WakeWordManager({
      keyword: "jarvis",
      language: "it-IT",
      onWakeWord: vi.fn(),
      onError,
    });

    manager.start();

    expect(onError).toHaveBeenCalledWith(
      new Error("Speech Recognition API not supported in this browser"),
    );
  });

  it("starts recognition, ignores no-speech and emits the full transcript on final wake word", async () => {
    const recognition = new MockSpeechRecognition();
    class SpeechRecognitionMock {
      constructor() {
        return recognition;
      }
    }
    vi.stubGlobal("window", {
      SpeechRecognition: SpeechRecognitionMock,
      webkitSpeechRecognition: undefined,
    });

    const { WakeWordManager } = await import("./wake-word.manager");
    const onWakeWord = vi.fn();
    const onError = vi.fn();
    const manager = new WakeWordManager({
      keyword: "jarvis",
      language: "it-IT",
      onWakeWord,
      onError,
    });

    manager.start();

    expect(recognition.continuous).toBe(true);
    expect(recognition.interimResults).toBe(true);
    expect(recognition.lang).toBe("it-IT");
    expect(recognition.start).toHaveBeenCalledOnce();

    recognition.onerror?.({ error: "no-speech" });
    recognition.onerror?.({ error: "network" });

    recognition.onresult?.({
      resultIndex: 0,
      results: [
        [{ transcript: "ciao jarvis" }, { transcript: "unused" }],
      ].map((alternatives) => Object.assign(alternatives, { isFinal: false })),
    });
    expect(onWakeWord).not.toHaveBeenCalled();

    recognition.onresult?.({
      resultIndex: 0,
      results: [
        [{ transcript: "Jarvis apri il calendario" }],
      ].map((alternatives) => Object.assign(alternatives, { isFinal: true })),
    });

    expect(recognition.stop).toHaveBeenCalledOnce();
    expect(onWakeWord).toHaveBeenCalledWith("Jarvis apri il calendario");
    expect(onError).toHaveBeenCalledWith(new Error("Speech recognition error: network"));

    recognition.onend?.();
    expect(recognition.start).toHaveBeenCalledTimes(1);

    manager.resume();
    expect(recognition.start).toHaveBeenCalledTimes(2);

    manager.pause();
    expect(recognition.stop).toHaveBeenCalledTimes(2);

    manager.stop();
    manager.dispose();
    expect(recognition.stop).toHaveBeenCalledTimes(3);
  });

  it("restarts automatically after onend while still listening", async () => {
    const recognition = new MockSpeechRecognition();
    class WebkitSpeechRecognitionMock {
      constructor() {
        return recognition;
      }
    }
    vi.stubGlobal("window", {
      SpeechRecognition: undefined,
      webkitSpeechRecognition: WebkitSpeechRecognitionMock,
    });

    const { WakeWordManager } = await import("./wake-word.manager");
    const manager = new WakeWordManager({
      keyword: "jarvis",
      language: "it-IT",
      onWakeWord: vi.fn(),
    });

    manager.start();
    recognition.onend?.();

    expect(recognition.start).toHaveBeenCalledTimes(2);
  });
});
