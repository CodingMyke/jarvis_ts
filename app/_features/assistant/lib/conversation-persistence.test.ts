// used the fkg testing skill zioo
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  appendChatTurns,
  createChat,
  deleteChatById,
  fetchChatById,
} from "./conversation-persistence";

describe("conversation persistence helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("creates, appends and fetches chats through the API", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, chat: { id: "chat-1" } }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, chat: { id: "chat-1" } }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            chat: {
              full_history: [{ role: "user", parts: [{ text: "ciao" }] }],
              assistant_history: [],
            },
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    await expect(createChat([{ role: "user", parts: [{ text: "ciao" }] }])).resolves.toEqual({
      success: true,
      chat: { id: "chat-1" },
    });
    await expect(
      appendChatTurns("chat-1", [{ role: "model", parts: [{ text: "ciao!" }] }]),
    ).resolves.toEqual({
      success: true,
      chat: { id: "chat-1" },
    });
    await expect(fetchChatById("chat id/1")).resolves.toEqual({
      success: true,
      chat: {
        full_history: [{ role: "user", parts: [{ text: "ciao" }] }],
        assistant_history: [],
      },
    });

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      credentials: "same-origin",
    });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "PATCH",
      credentials: "same-origin",
    });
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("chat%20id%2F1");
  });

  it("returns null on non-ok responses and surfaces delete errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("fail", { status: 500 }))
      .mockResolvedValueOnce(new Response("fail", { status: 500 }))
      .mockResolvedValueOnce(new Response("fail", { status: 404 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Chat non trovata" }), { status: 404 }),
      )
      .mockResolvedValueOnce(new Response("broken json", { status: 500 }));

    vi.stubGlobal("fetch", fetchMock);

    await expect(createChat([])).resolves.toBeNull();
    await expect(appendChatTurns("chat-1", [])).resolves.toBeNull();
    await expect(fetchChatById("chat-1")).resolves.toBeNull();
    await expect(deleteChatById("chat-1")).resolves.toEqual({
      ok: false,
      message: "Chat non trovata",
    });
    await expect(deleteChatById("chat-2")).resolves.toEqual({
      ok: false,
      message: "Eliminazione fallita",
    });
  });
});
