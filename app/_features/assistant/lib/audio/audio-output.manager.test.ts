// used the fkg testing skill zioo
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface MockSourceNode {
  buffer: { duration: number } | null;
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
}

describe("AudioOutputManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("buffers playback, monitors levels and handles clear/dispose", async () => {
    const channelData = new Float32Array(4_800);
    const createdSources: MockSourceNode[] = [];
    const analyserNode = {
      fftSize: 0,
      smoothingTimeConstant: 0,
      frequencyBinCount: 4,
      connect: vi.fn(),
      getByteFrequencyData: vi.fn((array: Uint8Array) => array.set([128, 128, 128, 128])),
    };
    const gainNode = {
      connect: vi.fn(),
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
    };
    const audioContext = {
      currentTime: 1,
      destination: {},
      createAnalyser: vi.fn(() => analyserNode),
      createGain: vi.fn(() => gainNode),
      createBuffer: vi.fn(() => ({
        duration: 0.2,
        getChannelData: vi.fn(() => channelData),
      })),
      createBufferSource: vi.fn(() => {
        const source: MockSourceNode = {
          buffer: null,
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          onended: null,
        };
        createdSources.push(source);
        return source;
      }),
      close: vi.fn(),
    };
    let audioContextOptions: unknown;
    class AudioContextMock {
      constructor(options: unknown) {
        audioContextOptions = options;
        return audioContext;
      }
    }

    vi.stubGlobal("window", {});
    vi.stubGlobal("AudioContext", AudioContextMock);

    const { AudioOutputManager } = await import("./audio-output.manager");
    const onLevelChange = vi.fn();
    const onPlaybackStart = vi.fn();
    const onPlaybackEnd = vi.fn();
    const onError = vi.fn();
    const manager = new AudioOutputManager({
      format: { sampleRate: 24_000, channels: 1, bitDepth: 16 },
      onLevelChange,
      onPlaybackStart,
      onPlaybackEnd,
      onError,
    });

    expect(manager.playing).toBe(false);
    expect(manager.queueLength).toBe(0);

    manager.playChunk(new Int16Array(4_800).buffer);

    expect(audioContextOptions).toEqual({ sampleRate: 24_000 });
    expect(onPlaybackStart).toHaveBeenCalledOnce();
    expect(createdSources).toHaveLength(1);
    expect(createdSources[0]?.start).toHaveBeenCalledWith(1.05);
    expect(manager.playing).toBe(true);
    expect(manager.queueLength).toBe(1);

    vi.advanceTimersByTime(50);
    expect(onLevelChange).toHaveBeenCalledWith(1);

    createdSources[0]?.onended?.();
    expect(onPlaybackEnd).toHaveBeenCalledOnce();
    expect(manager.playing).toBe(false);

    manager.enqueue(new Int16Array(100).buffer);
    expect(manager.queueLength).toBe(0);
    manager.flush();
    expect(createdSources).toHaveLength(2);

    manager.clear();
    vi.advanceTimersByTime(30);
    expect(gainNode.gain.linearRampToValueAtTime).toHaveBeenCalled();
    expect(createdSources[1]?.stop).toHaveBeenCalled();

    manager.dispose();
    expect(audioContext.close).toHaveBeenCalledOnce();
    expect(onLevelChange).toHaveBeenLastCalledWith(0);
  });

  it("throws outside the browser and surfaces enqueue errors", async () => {
    const { AudioOutputManager } = await import("./audio-output.manager");
    const onError = vi.fn();
    const manager = new AudioOutputManager({
      format: { sampleRate: 24_000, channels: 1, bitDepth: 16 },
      onError,
    });

    expect(() => manager.initialize()).toThrow("AudioOutputManager can only be used in browser");

    vi.stubGlobal("window", {});
    class FailingAudioContextMock {
      constructor(_options: unknown) {
        return {
          currentTime: 0,
          destination: {},
          createAnalyser: vi.fn(() => ({
            fftSize: 0,
            smoothingTimeConstant: 0,
            frequencyBinCount: 4,
            connect: vi.fn(),
            getByteFrequencyData: vi.fn(),
          })),
          createGain: vi.fn(() => ({
            connect: vi.fn(),
            gain: {
              value: 1,
              setValueAtTime: vi.fn(),
              linearRampToValueAtTime: vi.fn(),
            },
          })),
          createBuffer: vi.fn(() => {
            throw new Error("buffer failed");
          }),
          createBufferSource: vi.fn(),
          close: vi.fn(),
        };
      }
    }

    vi.stubGlobal("AudioContext", FailingAudioContextMock);

    manager.playChunk(new Int16Array(4_800).buffer);
    expect(onError).toHaveBeenCalledWith(new Error("buffer failed"));
  });
});
