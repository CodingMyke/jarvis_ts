import type { SystemToolDefinition, ToolDeclaration } from "./types";
import { endConversationTool } from "./definitions/end-conversation.tool";

/**
 * Tutti i tools di sistema con la loro implementazione.
 * Aggiungi qui nuovi tools per renderli disponibili.
 */
export const SYSTEM_TOOLS: SystemToolDefinition[] = [endConversationTool];

/**
 * Mappa nome -> tool per lookup veloce durante l'esecuzione.
 */
export const SYSTEM_TOOLS_MAP = new Map<string, SystemToolDefinition>(
  SYSTEM_TOOLS.map((tool) => [tool.name, tool])
);

/**
 * Dichiarazioni dei tools (senza execute) per la configurazione Gemini.
 */
export const SYSTEM_TOOL_DECLARATIONS: ToolDeclaration[] = SYSTEM_TOOLS.map(
  ({ name, description, parameters }) => ({ name, description, parameters })
);
