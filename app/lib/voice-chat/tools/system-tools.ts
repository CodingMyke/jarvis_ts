import type { SystemToolDefinition, ToolDeclaration } from "./types";
import { endConversationTool } from "./definitions/end-conversation.tool";
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
import { createSemanticMemoryTool } from "./definitions/create-semantic-memory.tool";
import { updateSemanticMemoryTool } from "./definitions/update-semantic-memory.tool";
import { deleteSemanticMemoryTool } from "./definitions/delete-semantic-memory.tool";
import { getEpisodicMemoriesTool } from "./definitions/get-episodic-memories.tool";
import { createEpisodicMemoryTool } from "./definitions/create-episodic-memory.tool";
import { updateEpisodicMemoryTool } from "./definitions/update-episodic-memory.tool";
import { deleteEpisodicMemoryTool } from "./definitions/delete-episodic-memory.tool";

/**
 * Tutti i tools di sistema con la loro implementazione.
 * Aggiungi qui nuovi tools per renderli disponibili.
 */
export const SYSTEM_TOOLS: SystemToolDefinition[] = [
  endConversationTool,
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
  createSemanticMemoryTool,
  updateSemanticMemoryTool,
  deleteSemanticMemoryTool,
  getEpisodicMemoriesTool,
  createEpisodicMemoryTool,
  updateEpisodicMemoryTool,
  deleteEpisodicMemoryTool,
];

/**
 * Dichiarazioni dei tools (senza execute) per la configurazione Gemini.
 */
export const SYSTEM_TOOL_DECLARATIONS: ToolDeclaration[] = SYSTEM_TOOLS.map(
  ({ execute, ...other }) => other,
);
