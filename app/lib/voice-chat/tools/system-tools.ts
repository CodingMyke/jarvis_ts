import type { SystemToolDefinition, ToolDeclaration } from "./types";
import { endConversationTool } from "./definitions/end-conversation.tool";
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

/**
 * Tutti i tools di sistema con la loro implementazione.
 * Aggiungi qui nuovi tools per renderli disponibili.
 */
export const SYSTEM_TOOLS: SystemToolDefinition[] = [
  endConversationTool,
  getCalendarEventsTool,
  startTimerTool,
  stopTimerTool,
  getTimerStatusTool,
  pauseTimerTool,
  resumeTimerTool,
  createTodoTool,
  getTodosTool,
  updateTodoTool,
  deleteTodoTool,
];

/**
 * Dichiarazioni dei tools (senza execute) per la configurazione Gemini.
 */
export const SYSTEM_TOOL_DECLARATIONS: ToolDeclaration[] = SYSTEM_TOOLS.map(
  ({ execute, ...other }) => other,
);
