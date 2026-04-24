// used the fkg testing skill zioo
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SessionConfig } from "../../../types/messages.types";
import {
  buildActivityEndMessage,
  buildActivityStartMessage,
  buildAudioMessage,
  buildHistoryMessage,
  buildSetupMessage,
  buildToolResponseMessage,
  parseServerMessage,
} from "./gemini-messages";

describe("gemini messages helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("builds setup, audio, activity and tool-response payloads", () => {
    vi.stubGlobal("btoa", (value: string) => Buffer.from(value, "binary").toString("base64"));
    const sessionConfig: SessionConfig = {
      model: "models/test",
      generationConfig: {
        responseModalities: ["AUDIO"],
      },
    };

    expect(buildSetupMessage(sessionConfig)).toEqual({
      setup: sessionConfig,
    });
    expect(buildAudioMessage(Uint8Array.from([1, 2, 3]).buffer)).toEqual({
      realtimeInput: {
        audio: {
          data: Buffer.from([1, 2, 3]).toString("base64"),
          mimeType: "audio/pcm;rate=16000",
        },
      },
    });
    expect(buildActivityStartMessage()).toEqual({
      realtimeInput: { activityStart: {} },
    });
    expect(buildActivityEndMessage()).toEqual({
      realtimeInput: { activityEnd: {} },
    });
    expect(
      buildToolResponseMessage([{ id: "1", name: "tool", response: { result: "{}" } }]),
    ).toEqual({
      toolResponse: {
        functionResponses: [{ id: "1", name: "tool", response: { result: "{}" } }],
      },
    });
  });

  it("builds history payloads without the legacy thinking field", () => {
    expect(
      buildHistoryMessage(
        [
          {
            role: "model",
            parts: [{ text: "Riassunto" }],
            thinking: "non deve passare",
          },
        ],
        true,
      ),
    ).toEqual({
      clientContent: {
        turns: [{ role: "model", parts: [{ text: "Riassunto" }] }],
        turnComplete: true,
      },
    });
  });

  it("parses server messages and returns null on invalid JSON", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(parseServerMessage('{"setupComplete":true}')).toEqual({ setupComplete: true });
    expect(parseServerMessage("{")).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });
});
