// used the fkg testing skill zioo
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConversationStorage } from "./conversation-storage";

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear(): void {
      store.clear();
    },
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    setItem(key: string, value: string): void {
      store.set(key, value);
    },
  };
}

describe("ConversationStorage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("maps messages into turns and decides when summarization is required", () => {
    const storage = new ConversationStorage({ summarizeThreshold: 2 });
    const messages = [
      { id: "1", text: "Ciao", isUser: true },
      { id: "2", text: "Sto pensando", isUser: false, thinking: "..." },
      { id: "3", text: "Ancora io", isUser: true },
    ];

    expect(storage.messagesToTurns(messages)).toEqual([
      { role: "user", parts: [{ text: "Ciao" }] },
      { role: "model", parts: [{ text: "Sto pensando" }], thinking: "..." },
      { role: "user", parts: [{ text: "Ancora io" }] },
    ]);
    expect(storage.countUserMessages(messages)).toBe(2);
    expect(storage.needsSummarization(messages)).toBe(true);
  });

  it("saves conversations, reuses ids and handles invalid persisted JSON", () => {
    vi.stubGlobal("window", {});
    const localStorage = createLocalStorageMock();
    vi.stubGlobal("localStorage", localStorage);
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(2000)
      .mockReturnValueOnce(3000);

    const storage = new ConversationStorage({ storageKey: "chat-key" });
    const messages = [{ id: "1", text: "Ciao", isUser: true }];

    storage.save(messages);
    expect(storage.load()).toEqual({
      id: "conv_1000",
      createdAt: 1000,
      updatedAt: 1000,
      turns: [{ role: "user", parts: [{ text: "Ciao" }] }],
      isSummarized: false,
    });

    storage.saveTurns([{ role: "model", parts: [{ text: "Riassunto" }] }], true);
    expect(storage.load()).toEqual({
      id: "conv_1000",
      createdAt: 1000,
      updatedAt: 2000,
      turns: [{ role: "model", parts: [{ text: "Riassunto" }] }],
      isSummarized: true,
    });

    localStorage.setItem("chat-key", "{");
    expect(storage.load()).toBeNull();

    storage.clear();
    expect(localStorage.getItem("chat-key")).toBeNull();
  });

  it("no-ops when window is unavailable", () => {
    const storage = new ConversationStorage();

    expect(storage.load()).toBeNull();
    expect(() => storage.save([{ id: "1", text: "Ciao", isUser: true }])).not.toThrow();
    expect(() =>
      storage.saveTurns([{ role: "user", parts: [{ text: "Ciao" }] }]),
    ).not.toThrow();
    expect(() => storage.clear()).not.toThrow();
  });
});
