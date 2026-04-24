import {
  CREATE_CALENDAR_EVENT_TOOL_NAME,
  CREATE_TODO_TOOL_NAME,
  DELETE_CALENDAR_EVENT_TOOL_NAME,
  DELETE_TODO_TOOL_NAME,
  UPDATE_CALENDAR_EVENT_TOOL_NAME,
  UPDATE_TODO_TOOL_NAME,
} from "@/app/_features/assistant/tools/definitions";

const CALENDAR_MUTATION_TOOLS = [
  CREATE_CALENDAR_EVENT_TOOL_NAME,
  UPDATE_CALENDAR_EVENT_TOOL_NAME,
  DELETE_CALENDAR_EVENT_TOOL_NAME,
];

const TASK_MUTATION_TOOLS = [
  CREATE_TODO_TOOL_NAME,
  UPDATE_TODO_TOOL_NAME,
  DELETE_TODO_TOOL_NAME,
];

export function isSuccessfulToolResult(result: unknown): result is { success: boolean } {
  return (
    result !== null
    && typeof result === "object"
    && "success" in result
    && (result as { success: boolean }).success === true
  );
}

export function isCalendarMutationTool(toolName: string): boolean {
  return CALENDAR_MUTATION_TOOLS.includes(toolName);
}

export function isTaskMutationTool(toolName: string): boolean {
  return TASK_MUTATION_TOOLS.includes(toolName);
}
