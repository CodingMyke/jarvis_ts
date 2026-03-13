import type { SystemToolDefinition, ToolDeclaration } from "./types";
import { endConversationTool } from "./definitions/end-conversation.tool";
import { deleteChatTool } from "./definitions/delete-chat.tool";
import { disableAssistantTool } from "./definitions/disable-assistant.tool";
import { getCalendarEventsTool } from "./definitions/get-calendar-events.tool";
import { startTimerTool } from "./definitions/start-timer.tool";
import { stopTimerTool } from "./definitions/stop-timer.tool";
import { getTimerStatusTool } from "./definitions/get-timer-status.tool";
import { pauseTimerTool } from "./definitions/pause-timer.tool";
import { resumeTimerTool } from "./definitions/resume-timer.tool";
import { createTodoTool } from "./definitions/create-todo.tool";
import { getTodosTool } from "./definitions/get-todos.tool";
import { updateTodoTool } from "./definitions/update-todo.tool";
import { deleteTodoTool } from "./definitions/delete-todo.tool";
import { createCalendarEventTool } from "./definitions/create-calendar-event.tool";
import { updateCalendarEventTool } from "./definitions/update-calendar-event.tool";
import { deleteCalendarEventTool } from "./definitions/delete-calendar-event.tool";
import { getSemanticMemoriesTool } from "./definitions/get-semantic-memories.tool";
import { searchSemanticMemoriesTool } from "./definitions/search-semantic-memories.tool";
import { createSemanticMemoryTool } from "./definitions/create-semantic-memory.tool";
import { updateSemanticMemoryTool } from "./definitions/update-semantic-memory.tool";
import { deleteSemanticMemoryTool } from "./definitions/delete-semantic-memory.tool";
import { getEpisodicMemoriesTool } from "./definitions/get-episodic-memories.tool";
import { searchEpisodicMemoriesTool } from "./definitions/search-episodic-memories.tool";
import { createEpisodicMemoryTool } from "./definitions/create-episodic-memory.tool";
import { updateEpisodicMemoryTool } from "./definitions/update-episodic-memory.tool";
import { deleteEpisodicMemoryTool } from "./definitions/delete-episodic-memory.tool";
import { searchChatsTool } from "./definitions/search-chats.tool";
import { listChatsTool } from "./definitions/list-chats.tool";
import { switchToChatTool } from "./definitions/switch-to-chat.tool";
import { createNewChatTool } from "./definitions/create-new-chat.tool";
import { CREATE_EPISODIC_MEMORY_TOOL_NAME } from "./definitions/create-episodic-memory.tool";
import { UPDATE_EPISODIC_MEMORY_TOOL_NAME } from "./definitions/update-episodic-memory.tool";
import { DELETE_EPISODIC_MEMORY_TOOL_NAME } from "./definitions/delete-episodic-memory.tool";
import { CREATE_SEMANTIC_MEMORY_TOOL_NAME } from "./definitions/create-semantic-memory.tool";
import { UPDATE_SEMANTIC_MEMORY_TOOL_NAME } from "./definitions/update-semantic-memory.tool";
import { DELETE_SEMANTIC_MEMORY_TOOL_NAME } from "./definitions/delete-semantic-memory.tool";
import { SEARCH_EPISODIC_MEMORIES_TOOL_NAME } from "./definitions/search-episodic-memories.tool";
import { SEARCH_SEMANTIC_MEMORIES_TOOL_NAME } from "./definitions/search-semantic-memories.tool";

/**
 * Tool di scrittura memoria (create/update/delete): sempre in background.
 */
export const BACKGROUND_MEMORY_WRITE_TOOL_NAMES = new Set<string>([
  CREATE_EPISODIC_MEMORY_TOOL_NAME,
  UPDATE_EPISODIC_MEMORY_TOOL_NAME,
  DELETE_EPISODIC_MEMORY_TOOL_NAME,
  CREATE_SEMANTIC_MEMORY_TOOL_NAME,
  UPDATE_SEMANTIC_MEMORY_TOOL_NAME,
  DELETE_SEMANTIC_MEMORY_TOOL_NAME,
]);

/**
 * Tool di search memoria. Usati per decidere se la search è "per rispondere" (bloccante)
 * o "per deduplicazione" (background quando c'è anche un write nello stesso turn).
 */
export const MEMORY_SEARCH_TOOL_NAMES = new Set<string>([
  SEARCH_EPISODIC_MEMORIES_TOOL_NAME,
  SEARCH_SEMANTIC_MEMORIES_TOOL_NAME,
]);

/**
 * Tutti i tools di sistema con la loro implementazione.
 * Aggiungi qui nuovi tools per renderli disponibili.
 */
export const SYSTEM_TOOLS: SystemToolDefinition[] = [
  endConversationTool,
  deleteChatTool,
  disableAssistantTool,
  getCalendarEventsTool,
  createCalendarEventTool,
  updateCalendarEventTool,
  deleteCalendarEventTool,
  startTimerTool,
  stopTimerTool,
  getTimerStatusTool,
  pauseTimerTool,
  resumeTimerTool,
  createTodoTool,
  getTodosTool,
  updateTodoTool,
  deleteTodoTool,
  getSemanticMemoriesTool,
  searchSemanticMemoriesTool,
  createSemanticMemoryTool,
  updateSemanticMemoryTool,
  deleteSemanticMemoryTool,
  getEpisodicMemoriesTool,
  searchEpisodicMemoriesTool,
  createEpisodicMemoryTool,
  updateEpisodicMemoryTool,
  deleteEpisodicMemoryTool,
  searchChatsTool,
  listChatsTool,
  switchToChatTool,
  createNewChatTool,
];

/**
 * Dichiarazioni dei tools (senza execute) per la configurazione Gemini.
 */
export const SYSTEM_TOOL_DECLARATIONS: ToolDeclaration[] = SYSTEM_TOOLS.map(
  ({ execute, ...other }) => other,
);
