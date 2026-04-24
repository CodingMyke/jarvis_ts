// used the fkg testing skill zioo
import { describe, expect, it } from "vitest";
import {
  chatsAppendBodySchema,
  chatsDeleteBodySchema,
  chatsQuerySchema,
} from "./chats-route.schemas";

describe("chats route schemas", () => {
  const chatId = "123e4567-e89b-12d3-a456-426614174000";

  it("accepts valid append payloads", () => {
    expect(
      chatsAppendBodySchema.safeParse({
        id: chatId,
        turns: [
          {
            role: "user",
            parts: [{ text: "ciao" }],
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects ambiguous query payloads", () => {
    expect(
      chatsQuerySchema.safeParse({
        id: chatId,
        search: "riunione",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid delete ids", () => {
    expect(chatsDeleteBodySchema.safeParse({ id: "not-a-uuid" }).success).toBe(false);
  });
});
