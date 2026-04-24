// used the fkg testing skill zioo
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class MockAudioWorkletNode {
  static lastInstance: MockAudioWorkletNode | null = null;

  readonly port = {
    onmessage: null as ((event: MessageEvent<{ samples: Float32Array }>) => void) | null,
  };

  constructor() {
    MockAudioWorkletNode.lastInstance = this;
  }

  connect = vi.fn();
  disconnect = vi.fn();
}

describe("AudioInputManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    MockAudioWorkletNode.lastInstance = null;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("captures microphone audio, emits levels/chunks and cleans up resources", async () => {
    const trackStop = vi.fn();
    const mediaStream = {
      getTracks: () => [{ stop: trackStop }],
    };
    const sourceNode = {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    const addModule = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn();
    const audioContext = {
      sampleRate: 48_000,
      destination: {},
      audioWorklet: { addModule },
      createMediaStreamSource: vi.fn(() => sourceNode),
      close,
    };
    let audioContextOptions: unknown;
    class AudioContextMock {
      constructor(options: unknown) {
        audioContextOptions = options;
        return audioContext;
      }
    }
    const getUserMedia = vi.fn().mockResolvedValue(mediaStream);

    vi.stubGlobal("window", {
      location: { origin: "https://jarvis.test" },
    });
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia },
    });
    vi.stubGlobal("AudioContext", AudioContextMock);
    vi.stubGlobal("AudioWorkletNode", MockAudioWorkletNode);
    vi.spyOn(Date, "now").mockReturnValue(123456);

    const { AudioInputManager } = await import("./audio-input.manager");
    const onLevelChange = vi.fn();
    const onChunk = vi.fn();
    const onError = vi.fn();
    const manager = new AudioInputManager({
      format: { sampleRate: 16_000, channels: 1, bitDepth: 16 },
      chunkIntervalMs: 100,
      onLevelChange,
      onChunk,
      onError,
    });

    await manager.start();
    expect(manager.capturing).toBe(true);
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: { ideal: 16_000 },
      },
    });
    expect(audioContextOptions).toEqual({ sampleRate: 16_000 });
    expect(addModule).toHaveBeenCalledWith(
      "https://jarvis.test/audio-capture-processor.worklet.js",
    );

    MockAudioWorkletNode.lastInstance?.port.onmessage?.({
      data: { samples: new Float32Array([0.5, -0.5, 1, -1, 0.25, -0.25]) },
    } as MessageEvent<{ samples: Float32Array }>);

    expect(onLevelChange).toHaveBeenCalledWith(expect.any(Number));

    vi.advanceTimersByTime(100);

    expect(onChunk).toHaveBeenCalledWith({
      data: expect.any(ArrayBuffer),
      timestamp: 123456,
    });

    manager.setMuted(true);
    expect(manager.muted).toBe(true);

    MockAudioWorkletNode.lastInstance?.port.onmessage?.({
      data: { samples: new Float32Array([1, 1, 1]) },
    } as MessageEvent<{ samples: Float32Array }>);
    vi.advanceTimersByTime(100);
    expect(onChunk).toHaveBeenCalledTimes(1);

    manager.stop();
    expect(manager.capturing).toBe(false);
    expect(sourceNode.disconnect).toHaveBeenCalledOnce();
    expect(MockAudioWorkletNode.lastInstance?.disconnect).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    expect(trackStop).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();

    manager.dispose();
  });

  it("throws outside the browser and forwards startup failures", async () => {
    const { AudioInputManager } = await import("./audio-input.manager");
    const onError = vi.fn();
    const manager = new AudioInputManager({
      format: { sampleRate: 16_000, channels: 1, bitDepth: 16 },
      chunkIntervalMs: 100,
      onChunk: vi.fn(),
      onError,
    });

    await expect(manager.start()).rejects.toThrow("AudioInputManager can only be used in browser");

    vi.stubGlobal("window", {
      location: { origin: "https://jarvis.test" },
    });
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue(new Error("mic denied")),
      },
    });

    await expect(manager.start()).rejects.toThrow("mic denied");
    expect(onError).toHaveBeenCalledWith(new Error("mic denied"));
  });
});
