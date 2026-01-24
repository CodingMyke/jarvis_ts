export { ToolsRegistry } from "./tools-registry";
export {
  SYSTEM_TOOLS,
  SYSTEM_TOOLS_MAP,
  SYSTEM_TOOL_DECLARATIONS,
} from "./system-tools";
export type {
  ToolDeclaration,
  SystemToolDefinition,
  ToolExecuteResult,
  ToolContext,
  ParameterProperty,
} from "./types";

// Re-export singoli tools per accesso diretto
export {
  endConversationTool,
  END_CONVERSATION_TOOL_NAME,
} from "./definitions/end-conversation.tool";
