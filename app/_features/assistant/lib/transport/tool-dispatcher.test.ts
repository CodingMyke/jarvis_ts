// used the fkg testing skill zioo
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createContext() {
  return {
    endConversation: vi.fn(),
    disableCompletely: vi.fn(),
    deleteCurrentChat: vi.fn().mockResolvedValue({ success: true }),
  };
}

describe("dispatchToolCalls", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("executes system, user and unknown tools and sends their responses", async () => {
    const executeSystem = vi.fn().mockResolvedValue({ result: { ok: true } });
    vi.doMock("../../tools", () => ({
      BACKGROUND_MEMORY_WRITE_TOOL_NAMES: new Set<string>(),
      MEMORY_SEARCH_TOOL_NAMES: new Set<string>(),
      SYSTEM_TOOLS: [
        {
          name: "systemTool",
          execute: executeSystem,
        },
      ],
    }));

    const { dispatchToolCalls } = await import("./tool-dispatcher");
    const executeUser = vi.fn().mockResolvedValue({ done: true });
    const onToolExecuted = vi.fn();
    const sendToolResponses = vi.fn();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await dispatchToolCalls({
      calls: [
        { id: "1", name: "systemTool", args: { foo: "bar" } },
        { id: "2", name: "userTool", args: { value: 1 } },
        { id: "3", name: "missingTool", args: {} },
      ],
      tools: [
        {
          name: "userTool",
          description: "User tool",
          execute: executeUser,
        },
      ],
      context: createContext(),
      onToolExecuted,
      sendToolResponses,
    });

    expect(executeSystem).toHaveBeenCalledWith({ foo: "bar" }, expect.any(Object));
    expect(executeUser).toHaveBeenCalledWith({ value: 1 });
    expect(onToolExecuted).toHaveBeenCalledWith("systemTool", { ok: true });
    expect(onToolExecuted).toHaveBeenCalledWith("userTool", { done: true });
    expect(sendToolResponses).toHaveBeenCalledWith([
      { id: "1", name: "systemTool", response: { result: JSON.stringify({ ok: true }) } },
      { id: "2", name: "userTool", response: { result: JSON.stringify({ done: true }) } },
      {
        id: "3",
        name: "missingTool",
        response: { result: "", error: 'Tool "missingTool" not found' },
      },
    ]);
    expect(errorSpy).toHaveBeenCalledWith('[GeminiLiveClient] Tool "missingTool" not found');
  });

  it("runs background memory tools asynchronously and surfaces failures", async () => {
    const executeWrite = vi.fn().mockResolvedValue({ result: { saved: true } });
    const executeSearch = vi.fn().mockRejectedValue(new Error("boom"));

    vi.doMock("../../tools", () => ({
      BACKGROUND_MEMORY_WRITE_TOOL_NAMES: new Set<string>(["writeMemory"]),
      MEMORY_SEARCH_TOOL_NAMES: new Set<string>(["searchMemory"]),
      SYSTEM_TOOLS: [
        { name: "writeMemory", execute: executeWrite },
        { name: "searchMemory", execute: executeSearch },
      ],
    }));

    const { dispatchToolCalls } = await import("./tool-dispatcher");
    const onToolExecuted = vi.fn();
    const onError = vi.fn();
    const sendToolResponses = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await dispatchToolCalls({
      calls: [
        { id: "1", name: "writeMemory", args: { content: "memo" } },
        { id: "2", name: "searchMemory", args: { content: "memo" } },
      ],
      tools: [],
      context: createContext(),
      onToolExecuted,
      onError,
      sendToolResponses,
    });

    expect(sendToolResponses).toHaveBeenCalledWith([
      {
        id: "1",
        name: "writeMemory",
        response: {
          result: JSON.stringify({
            ok: true,
            message: "Operazione avviata in background. Puoi continuare a parlare.",
          }),
        },
      },
      {
        id: "2",
        name: "searchMemory",
        response: {
          result: JSON.stringify({
            ok: true,
            message:
              "Ricerca eseguita in background per deduplicazione. Procedi con create; non attendere risultati.",
          }),
        },
      },
    ]);

    await Promise.resolve();
    await Promise.resolve();

    expect(onToolExecuted).toHaveBeenCalledWith("writeMemory", { saved: true });
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Operazione memoria in background fallita: boom",
        code: "API_ERROR",
        recoverable: false,
      }),
    );
  });

  it("maps execution failures and handles turns with no calls", async () => {
    const executeSystem = vi.fn().mockRejectedValue("system failure");
    vi.doMock("../../tools", () => ({
      BACKGROUND_MEMORY_WRITE_TOOL_NAMES: new Set<string>(),
      MEMORY_SEARCH_TOOL_NAMES: new Set<string>(),
      SYSTEM_TOOLS: [{ name: "systemTool", execute: executeSystem }],
    }));

    const { dispatchToolCalls } = await import("./tool-dispatcher");
    const executeUser = vi.fn().mockRejectedValue(new Error("user failure"));
    const sendToolResponses = vi.fn();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await dispatchToolCalls({
      calls: [
        { id: "1", name: "systemTool", args: {} },
        { id: "2", name: "userTool", args: {} },
      ],
      tools: [{ name: "userTool", description: "User tool", execute: executeUser }],
      context: createContext(),
      sendToolResponses,
    });

    expect(sendToolResponses).toHaveBeenCalledWith([
      { id: "1", name: "systemTool", response: { result: "", error: "system failure" } },
      { id: "2", name: "userTool", response: { result: "", error: "user failure" } },
    ]);

    await dispatchToolCalls({
      calls: [],
      tools: [],
      context: createContext(),
      sendToolResponses,
    });

    expect(warnSpy).toHaveBeenCalledWith("[GeminiLiveClient] No responses to send for", 0, "tool calls");
  });
});
