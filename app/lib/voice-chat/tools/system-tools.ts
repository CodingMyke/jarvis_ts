import type { SystemToolDefinition, ToolDeclaration } from "./types";
import { endConversationTool } from "./definitions/end-conversation.tool";
import { getCalendarEventsTool } from "./definitions/get-calendar-events.tool";

/**
 * Tutti i tools di sistema con la loro implementazione.
 * Aggiungi qui nuovi tools per renderli disponibili.
 */
export const SYSTEM_TOOLS: SystemToolDefinition[] = [
  endConversationTool,
  getCalendarEventsTool,
];

/**
 * Dichiarazioni dei tools (senza execute) per la configurazione Gemini.
 */
export const SYSTEM_TOOL_DECLARATIONS: ToolDeclaration[] = SYSTEM_TOOLS.map(
  ({ execute, ...other }) => other,
);
