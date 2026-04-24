// used the fkg testing skill zioo
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  base64ToPcm,
  calculateAudioLevel,
  downsample,
  float32ToInt16,
  int16ToFloat32,
  pcmToBase64,
} from "./audio-utils";

describe("audio utils", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("converts PCM buffers to and from base64", () => {
    vi.stubGlobal("btoa", (value: string) => Buffer.from(value, "binary").toString("base64"));
    vi.stubGlobal("atob", (value: string) => Buffer.from(value, "base64").toString("binary"));

    const source = Uint8Array.from([0, 127, 255]).buffer;
    const encoded = pcmToBase64(source);
    const decoded = new Uint8Array(base64ToPcm(encoded));

    expect(encoded).toBe(Buffer.from([0, 127, 255]).toString("base64"));
    expect(Array.from(decoded)).toEqual([0, 127, 255]);
  });

  it("converts Float32 and Int16 samples consistently", () => {
    expect(Array.from(float32ToInt16(new Float32Array([-2, -1, 0, 0.5, 1, 2])))).toEqual([
      -32768,
      -32768,
      0,
      16383,
      32767,
      32767,
    ]);

    const restored = int16ToFloat32(new Int16Array([-32768, 0, 16384, 32767]));
    expect(Array.from(restored)).toEqual([-1, 0, 0.5, 32767 / 32768]);
  });

  it("computes audio levels and downsamples buffers", () => {
    expect(calculateAudioLevel(new Float32Array())).toBe(0);
    expect(calculateAudioLevel(new Float32Array([1, -1]))).toBe(1);
    expect(Array.from(downsample(new Float32Array([1, 2, 3, 4]), 4, 2))).toEqual([1, 3]);

    const buffer = new Float32Array([1, 2, 3]);
    expect(downsample(buffer, 16_000, 16_000)).toBe(buffer);
  });
});
