// used the fkg testing skill zioo
import { beforeEach, describe, expect, it, vi } from "vitest";

const timerManagerMock = vi.hoisted(() => ({
  startTimer: vi.fn(),
  getActiveTimer: vi.fn(),
  pauseTimer: vi.fn(),
  resumeTimer: vi.fn(),
  stopTimer: vi.fn(),
  stopNotificationSound: vi.fn(),
}));

vi.mock("@/app/_features/timer", () => ({
  timerManager: timerManagerMock,
}));

import { createEpisodicMemoryTool } from "./create-episodic-memory.tool";
import { createNewChatTool } from "./create-new-chat.tool";
import { createSemanticMemoryTool } from "./create-semantic-memory.tool";
import { deleteChatTool } from "./delete-chat.tool";
import { deleteEpisodicMemoryTool } from "./delete-episodic-memory.tool";
import { deleteSemanticMemoryTool } from "./delete-semantic-memory.tool";
import { disableAssistantTool } from "./disable-assistant.tool";
import { endConversationTool } from "./end-conversation.tool";
import { getEpisodicMemoriesTool } from "./get-episodic-memories.tool";
import { getSemanticMemoriesTool } from "./get-semantic-memories.tool";
import { getTimerStatusTool } from "./get-timer-status.tool";
import { listChatsTool } from "./list-chats.tool";
import { pauseTimerTool } from "./pause-timer.tool";
import { resumeTimerTool } from "./resume-timer.tool";
import { searchChatsTool } from "./search-chats.tool";
import { searchEpisodicMemoriesTool } from "./search-episodic-memories.tool";
import { searchSemanticMemoriesTool } from "./search-semantic-memories.tool";
import { startTimerTool } from "./start-timer.tool";
import { stopTimerTool } from "./stop-timer.tool";
import { switchToChatTool } from "./switch-to-chat.tool";
import { updateEpisodicMemoryTool } from "./update-episodic-memory.tool";
import { updateSemanticMemoryTool } from "./update-semantic-memory.tool";

function jsonResponse(body: unknown, status: number = 200): Response {
  return Response.json(body, { status });
}

const context = {
  endConversation: vi.fn(),
  disableCompletely: vi.fn(),
  deleteCurrentChat: vi.fn(),
  deleteChatById: vi.fn(),
  switchToChat: vi.fn(),
  createNewChat: vi.fn(),
  getIsCurrentChatEmpty: vi.fn(),
};

describe("assistant misc tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("handles end/disable/new chat/switch chat flows", async () => {
    context.getIsCurrentChatEmpty.mockReturnValue(false);
    context.switchToChat.mockResolvedValue({ success: true });

    expect(endConversationTool.execute({}, context)).toEqual({
      result: { success: true, message: "Conversazione terminata" },
    });
    expect(context.endConversation).toHaveBeenCalledWith(2000);

    expect(disableAssistantTool.execute({}, context)).toEqual({
      result: { success: true, message: "Assistente disattivato" },
    });
    expect(context.disableCompletely).toHaveBeenCalledWith(2000);

    expect(createNewChatTool.execute({}, { ...context, createNewChat: undefined })).toEqual({
      result: {
        success: false,
        error: "NOT_AVAILABLE",
        errorMessage: "Creazione nuova chat non disponibile in questo contesto.",
      },
    });
    expect(createNewChatTool.execute({}, { ...context, getIsCurrentChatEmpty: () => true })).toEqual({
      result: {
        success: false,
        alreadyOnNewChat: true,
        message:
          "L'utente si trova già su una nuova chat (vuota o senza conversazione sostanziale). Informalo che non è necessario crearne un'altra.",
      },
    });
    expect(createNewChatTool.execute({}, context)).toEqual({
      result: {
        success: true,
        message: "Nuova chat creata. La conversazione si riaprirà sulla nuova chat.",
      },
    });

    await expect(switchToChatTool.execute({}, context)).resolves.toEqual({
      result: {
        success: false,
        error: "MISSING_CHAT_ID",
        errorMessage: "Il parametro chat_id è obbligatorio.",
      },
    });
    await expect(
      switchToChatTool.execute({ chat_id: "chat-1" }, { ...context, switchToChat: undefined }),
    ).resolves.toEqual({
      result: {
        success: false,
        error: "NOT_AVAILABLE",
        errorMessage: "Switch chat non disponibile in questo contesto.",
      },
    });
    await expect(
      switchToChatTool.execute(
        { chat_id: "chat-1" },
        { ...context, switchToChat: vi.fn().mockResolvedValue({ success: false, error: "boom" }) },
      ),
    ).resolves.toEqual({
      result: {
        success: false,
        error: "boom",
        errorMessage: "boom",
      },
    });
    await expect(switchToChatTool.execute({ chat_id: " chat-1 " }, context)).resolves.toEqual({
      result: {
        success: true,
        message: "Passaggio alla chat completato. La conversazione si riaprirà sulla chat selezionata.",
      },
    });
  });

  it("handles delete chat branches", async () => {
    context.deleteCurrentChat.mockResolvedValueOnce({ success: true });
    context.deleteCurrentChat.mockResolvedValueOnce({ success: false, error: "failed" });
    context.deleteChatById.mockResolvedValueOnce({ success: true });
    context.deleteChatById.mockResolvedValueOnce({ success: true });
    context.deleteChatById.mockResolvedValueOnce({ success: true });
    context.deleteChatById.mockResolvedValueOnce({ success: false, error: "boom" });

    await expect(deleteChatTool.execute({}, context)).resolves.toEqual({
      result: { success: true, message: "Chat eliminata definitivamente" },
    });
    await expect(deleteChatTool.execute({}, context)).resolves.toEqual({
      result: { success: false, error: "failed" },
    });
    await expect(
      deleteChatTool.execute({ chatId: "one", chatIds: [" one ", " ", "two"] }, context),
    ).resolves.toEqual({
      result: {
        success: true,
        message: "Chat eliminate definitivamente",
        deleted: 2,
      },
    });
    await expect(
      deleteChatTool.execute({ chatIds: ["one", "two"] }, context),
    ).resolves.toEqual({
      result: {
        success: true,
        message: "1 eliminate, 1 fallite",
        deleted: 1,
        failed: [{ id: "two", error: "boom" }],
      },
    });
    await expect(
      deleteChatTool.execute({ chatIds: ["one"] }, { ...context, deleteChatById: undefined }),
    ).resolves.toEqual({
      result: { success: false, error: "Eliminazione multipla non disponibile" },
    });
  });

  it("handles list and search chats via fetch", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ error: "boom", message: "bad" }, 500))
      .mockResolvedValueOnce(jsonResponse({ success: false, error: "nope", message: "fail" }))
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          chats: [
            {
              id: "chat-1",
              title: null,
              summary_text: null,
              last_activity_at: "2026-03-15T10:00:00.000Z",
              created_at: "2026-03-15T10:00:00.000Z",
            },
          ],
          count: 1,
        }),
      )
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ error: "boom", message: "bad" }, 500))
      .mockResolvedValueOnce(jsonResponse({ success: false, error: "nope", message: "fail" }))
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          matches: [{ chat_id: "chat-1", title: "Chat", summary_text: "Tema", similarity: 0.9 }],
          count: 1,
        }),
      )
      .mockRejectedValueOnce(new Error("network"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listChatsTool.execute({}, context)).resolves.toEqual({
      result: {
        success: false,
        error: "UNAUTHORIZED",
        errorMessage: "Utente non autenticato. Effettua il login.",
      },
    });
    await expect(listChatsTool.execute({}, context)).resolves.toEqual({
      result: { success: false, error: "boom", errorMessage: "bad" },
    });
    await expect(listChatsTool.execute({}, context)).resolves.toEqual({
      result: { success: false, error: "nope", errorMessage: "fail" },
    });
    await expect(listChatsTool.execute({}, context)).resolves.toEqual({
      result: {
        success: true,
        chats: [
          {
            chat_id: "chat-1",
            title: "",
            summary_text: "",
            last_activity_at: "2026-03-15T10:00:00.000Z",
            created_at: "2026-03-15T10:00:00.000Z",
          },
        ],
        count: 1,
      },
    });
    await expect(listChatsTool.execute({}, context)).resolves.toMatchObject({
      result: { success: false, error: "EXECUTION_ERROR", errorMessage: "network" },
    });

    await expect(searchChatsTool.execute({}, context)).resolves.toEqual({
      result: {
        success: false,
        error: "MISSING_QUERY",
        errorMessage: "Il parametro query è obbligatorio.",
      },
    });
    await expect(searchChatsTool.execute({ query: "tema" }, context)).resolves.toEqual({
      result: {
        success: false,
        error: "UNAUTHORIZED",
        errorMessage: "Utente non autenticato. Effettua il login.",
      },
    });
    await expect(searchChatsTool.execute({ query: "tema" }, context)).resolves.toEqual({
      result: { success: false, error: "boom", errorMessage: "bad" },
    });
    await expect(searchChatsTool.execute({ query: "tema" }, context)).resolves.toEqual({
      result: { success: false, error: "nope", errorMessage: "fail" },
    });
    await expect(searchChatsTool.execute({ query: "tema", limit: 25 }, context)).resolves.toEqual({
      result: {
        success: true,
        matches: [{ chat_id: "chat-1", title: "Chat", summary_text: "Tema", similarity: 0.9 }],
        count: 1,
      },
    });
    await expect(searchChatsTool.execute({ query: "tema" }, context)).resolves.toMatchObject({
      result: { success: false, error: "EXECUTION_ERROR", errorMessage: "network" },
    });
  });

  it("handles memory tools via fetch", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ success: true, memory: { id: "e-1" } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, memories: [{ id: "e-1" }], count: 1 }))
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ success: true, memories: [{ id: "e-1" }], count: 1 }))
      .mockResolvedValueOnce(jsonResponse({ success: false, error: "bad", message: "fail" }, 500))
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ success: true, deleted: { id: "e-1" } }))
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ success: true, memory: { id: "s-1" } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, memories: [{ id: "s-1" }], count: 1 }))
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ success: true, memories: [{ id: "s-1" }], count: 1 }))
      .mockResolvedValueOnce(jsonResponse({ success: false, error: "bad", message: "fail" }, 500))
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ success: true, deleted: { id: "s-1" } }))
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ success: true, memory: { id: "ce-1" } }))
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ success: true, memory: { id: "cs-1" } }))
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ success: true, memory: { id: "ue-1" } }))
      .mockResolvedValueOnce(jsonResponse({}, 404))
      .mockResolvedValueOnce(jsonResponse({ success: true, memory: { id: "us-1" } }))
      .mockResolvedValueOnce(jsonResponse({}, 404));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getEpisodicMemoriesTool.execute({}, context)).resolves.toMatchObject({
      result: { success: false, error: "UNAUTHORIZED" },
    });
    await expect(getEpisodicMemoriesTool.execute({ id: "e-1" }, context)).resolves.toEqual({
      result: { success: true, memory: { id: "e-1" } },
    });
    await expect(getEpisodicMemoriesTool.execute({}, context)).resolves.toEqual({
      result: { success: true, memories: [{ id: "e-1" }], count: 1 },
    });
    await expect(searchEpisodicMemoriesTool.execute({ query: "tema" }, context)).resolves.toMatchObject({
      result: { success: false, error: "UNAUTHORIZED" },
    });
    await expect(searchEpisodicMemoriesTool.execute({ query: "tema", match_count: 2 }, context)).resolves.toEqual({
      result: { success: true, memories: [{ id: "e-1" }], count: 1 },
    });
    await expect(searchEpisodicMemoriesTool.execute({ query: "tema" }, context)).resolves.toEqual({
      result: { success: false, error: "bad", errorMessage: "fail" },
    });
    await expect(deleteEpisodicMemoryTool.execute({ id: " " }, context)).resolves.toMatchObject({
      result: { success: false, error: "MISSING_ID" },
    });
    await expect(deleteEpisodicMemoryTool.execute({ id: "e-1" }, context)).resolves.toMatchObject({
      result: { success: false, error: "UNAUTHORIZED" },
    });
    await expect(deleteEpisodicMemoryTool.execute({ id: " e-1 " }, context)).resolves.toEqual({
      result: { success: true, deleted: { id: "e-1" } },
    });

    await expect(getSemanticMemoriesTool.execute({}, context)).resolves.toMatchObject({
      result: { success: false, error: "UNAUTHORIZED" },
    });
    await expect(getSemanticMemoriesTool.execute({ id: "s-1" }, context)).resolves.toEqual({
      result: { success: true, memory: { id: "s-1" } },
    });
    await expect(getSemanticMemoriesTool.execute({}, context)).resolves.toEqual({
      result: { success: true, memories: [{ id: "s-1" }], count: 1 },
    });
    await expect(searchSemanticMemoriesTool.execute({ query: "tema" }, context)).resolves.toMatchObject({
      result: { success: false, error: "UNAUTHORIZED" },
    });
    await expect(searchSemanticMemoriesTool.execute({ query: "tema" }, context)).resolves.toEqual({
      result: { success: true, memories: [{ id: "s-1" }], count: 1 },
    });
    await expect(searchSemanticMemoriesTool.execute({ query: "tema" }, context)).resolves.toEqual({
      result: { success: false, error: "bad", errorMessage: "fail" },
    });
    await expect(deleteSemanticMemoryTool.execute({ id: " " }, context)).resolves.toMatchObject({
      result: { success: false, error: "MISSING_ID" },
    });
    await expect(deleteSemanticMemoryTool.execute({ id: "s-1" }, context)).resolves.toMatchObject({
      result: { success: false, error: "UNAUTHORIZED" },
    });
    await expect(deleteSemanticMemoryTool.execute({ id: " s-1 " }, context)).resolves.toEqual({
      result: { success: true, deleted: { id: "s-1" } },
    });

    await expect(createEpisodicMemoryTool.execute({ content: " " }, context)).resolves.toMatchObject({
      result: { success: false, error: "INVALID_CONTENT" },
    });
    await expect(createEpisodicMemoryTool.execute({ content: "episodio" }, context)).resolves.toMatchObject({
      result: { success: false, error: "UNAUTHORIZED" },
    });
    await expect(createEpisodicMemoryTool.execute({ content: "episodio", ttl_days: "7" }, context)).resolves.toEqual({
      result: { success: true, memory: { id: "ce-1" } },
    });

    await expect(createSemanticMemoryTool.execute({ content: " " }, context)).resolves.toMatchObject({
      result: { success: false, error: "INVALID_CONTENT" },
    });
    await expect(createSemanticMemoryTool.execute({ content: "preferenza" }, context)).resolves.toMatchObject({
      result: { success: false, error: "UNAUTHORIZED" },
    });
    await expect(createSemanticMemoryTool.execute({ content: "preferenza", key: "coffee" }, context)).resolves.toEqual({
      result: { success: true, memory: { id: "cs-1" } },
    });

    await expect(updateEpisodicMemoryTool.execute({ id: " " }, context)).resolves.toMatchObject({
      result: { success: false, error: "MISSING_ID" },
    });
    await expect(updateEpisodicMemoryTool.execute({ id: "ue-1" }, context)).resolves.toMatchObject({
      result: { success: false, error: "UNAUTHORIZED" },
    });
    await expect(updateEpisodicMemoryTool.execute({ id: " ue-1 ", ttl_days: "7" }, context)).resolves.toEqual({
      result: { success: true, memory: { id: "ue-1" } },
    });
    await expect(updateSemanticMemoryTool.execute({ id: " " }, context)).resolves.toMatchObject({
      result: { success: false, error: "MISSING_ID" },
    });
    await expect(updateSemanticMemoryTool.execute({ id: "us-1" }, context)).resolves.toEqual({
      result: { success: false, error: "NOT_FOUND", errorMessage: "Memoria non trovata" },
    });
    await expect(updateSemanticMemoryTool.execute({ id: " us-1 ", key: "coffee" }, context)).resolves.toEqual({
      result: { success: true, memory: { id: "us-1" } },
    });
  });

  it("handles timer tools", async () => {
    timerManagerMock.startTimer.mockReturnValue("timer-1");
    timerManagerMock.getActiveTimer
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({
        id: "timer-1",
        remainingSeconds: 90,
        durationSeconds: 120,
        isActive: true,
        isExpired: false,
        isPaused: false,
      })
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ id: "timer-1", isPaused: true, isExpired: false })
      .mockReturnValueOnce({ id: "timer-1", isPaused: false, isExpired: true })
      .mockReturnValueOnce({ id: "timer-1", isPaused: false, isExpired: false })
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ id: "timer-1", isPaused: false, isExpired: false })
      .mockReturnValueOnce({ id: "timer-1", isPaused: true, isExpired: false })
      .mockReturnValueOnce({ id: "timer-1", isPaused: false, isExpired: true });

    await expect(startTimerTool.execute({ duration: "5 minuti" }, context)).resolves.toEqual({
      result: {
        success: true,
        timerId: "timer-1",
        durationSeconds: 300,
        formattedDuration: "5 minuti",
      },
    });
    await expect(startTimerTool.execute({ duration: "0" }, context)).resolves.toEqual({
      result: { success: false, error: "INVALID_DURATION", minSeconds: 1 },
    });
    await expect(startTimerTool.execute({ duration: String(24 * 60 * 60 + 1) }, context)).resolves.toEqual({
      result: { success: false, error: "DURATION_TOO_LONG", maxSeconds: 24 * 60 * 60 },
    });
    await expect(startTimerTool.execute({ duration: "abc" }, context)).resolves.toMatchObject({
      result: { success: false, error: "EXECUTION_ERROR" },
    });

    timerManagerMock.getActiveTimer.mockReset();
    timerManagerMock.getActiveTimer
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({
        id: "timer-1",
        remainingSeconds: 90,
        durationSeconds: 120,
        isActive: true,
        isExpired: false,
        isPaused: false,
      });

    await expect(getTimerStatusTool.execute({}, context)).resolves.toEqual({
      result: { success: false, error: "NO_ACTIVE_TIMER" },
    });
    await expect(getTimerStatusTool.execute({}, context)).resolves.toEqual({
      result: {
        success: true,
        timerId: "timer-1",
        remainingSeconds: 90,
        remainingFormatted: "1 minuto e 30 secondi",
        totalSeconds: 120,
        totalFormatted: "2 minuti",
        isActive: true,
        isExpired: false,
        isPaused: false,
      },
    });

    timerManagerMock.getActiveTimer.mockReset();
    timerManagerMock.getActiveTimer
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ id: "timer-1", isPaused: true, isExpired: false })
      .mockReturnValueOnce({ id: "timer-1", isPaused: false, isExpired: true })
      .mockReturnValueOnce({ id: "timer-1", isPaused: false, isExpired: false });

    await expect(pauseTimerTool.execute({}, context)).resolves.toEqual({
      result: { success: false, error: "NO_ACTIVE_TIMER" },
    });
    await expect(pauseTimerTool.execute({}, context)).resolves.toEqual({
      result: { success: false, error: "TIMER_ALREADY_PAUSED" },
    });
    await expect(pauseTimerTool.execute({}, context)).resolves.toEqual({
      result: { success: false, error: "TIMER_EXPIRED" },
    });
    await expect(pauseTimerTool.execute({}, context)).resolves.toEqual({
      result: { success: true },
    });

    timerManagerMock.getActiveTimer.mockReset();
    timerManagerMock.getActiveTimer
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ id: "timer-1", isPaused: false, isExpired: false })
      .mockReturnValueOnce({ id: "timer-1", isPaused: true, isExpired: true })
      .mockReturnValueOnce({ id: "timer-1", isPaused: true, isExpired: false });

    await expect(resumeTimerTool.execute({}, context)).resolves.toEqual({
      result: { success: false, error: "NO_ACTIVE_TIMER" },
    });
    await expect(resumeTimerTool.execute({}, context)).resolves.toEqual({
      result: { success: false, error: "TIMER_NOT_PAUSED" },
    });
    await expect(resumeTimerTool.execute({}, context)).resolves.toEqual({
      result: { success: false, error: "TIMER_EXPIRED" },
    });
    await expect(resumeTimerTool.execute({}, context)).resolves.toEqual({
      result: { success: true },
    });

    timerManagerMock.getActiveTimer.mockReset();
    timerManagerMock.getActiveTimer
      .mockReturnValueOnce({ id: "timer-1" })
      .mockReturnValueOnce(null);

    await expect(stopTimerTool.execute({}, context)).resolves.toEqual({
      result: { success: true },
    });
    await expect(stopTimerTool.execute({}, context)).resolves.toEqual({
      result: { success: false, error: "NO_ACTIVE_TIMER" },
    });
  });
});
