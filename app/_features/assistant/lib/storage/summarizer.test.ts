// used the fkg testing skill zioo
import { describe, expect, it } from "vitest";

import {
  createSummaryTurn,
  createSummaryTurns,
  summarizeConversation,
} from "./summarizer";

describe("conversation summarizer helpers", () => {
  it("returns the current placeholder summary implementation", async () => {
    await expect(
      summarizeConversation([{ role: "user", parts: [{ text: "Ciao" }] }], "api-key"),
    ).resolves.toBe("");
  });

  it("creates the summary turns used for compacted histories", () => {
    expect(createSummaryTurn("Riassunto")).toEqual({
      role: "model",
      parts: [{ text: "Riassunto" }],
    });
    expect(createSummaryTurns("Riassunto")).toEqual([
      {
        role: "user",
        parts: [
          {
            text: "Ecco un riassunto della nostra conversazione precedente per contesto:",
          },
        ],
      },
      {
        role: "model",
        parts: [{ text: "Riassunto" }],
      },
    ]);
  });
});
