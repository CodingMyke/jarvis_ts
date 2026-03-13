import {
  BACKGROUND_MEMORY_WRITE_TOOL_NAMES,
  MEMORY_SEARCH_TOOL_NAMES,
  SYSTEM_TOOLS,
  type ToolContext,
} from "../../tools";
import type {
  FunctionCall,
  FunctionResponse,
  ToolDefinition,
} from "../../types/tools.types";
import { VoiceChatError } from "../../types/client.types";

interface ToolDispatcherOptions {
  calls: FunctionCall[];
  tools: ToolDefinition[];
  context: ToolContext;
  onToolExecuted?: (toolName: string, result: unknown) => void;
  onError?: (error: VoiceChatError) => void;
  sendToolResponses: (responses: FunctionResponse[]) => void;
}

export async function dispatchToolCalls(options: ToolDispatcherOptions): Promise<void> {
  const { calls, tools, context, onToolExecuted, onError, sendToolResponses } = options;

  console.log(
    "[GeminiLiveClient] handleToolCalls called with",
    calls.length,
    "calls:",
    calls.map((call) => call.name)
  );

  const hasMemoryWriteInTurn = calls.some((call) =>
    BACKGROUND_MEMORY_WRITE_TOOL_NAMES.has(call.name)
  );

  const backgroundToolNamesThisTurn = new Set(BACKGROUND_MEMORY_WRITE_TOOL_NAMES);
  if (hasMemoryWriteInTurn) {
    MEMORY_SEARCH_TOOL_NAMES.forEach((toolName) => backgroundToolNamesThisTurn.add(toolName));
  }

  const responses = await Promise.all(
    calls.map((call) =>
      runSingleToolCall({
        call,
        tools,
        context,
        backgroundToolNamesThisTurn,
        onToolExecuted,
        onError,
      })
    )
  );

  if (responses.length === 0) {
    console.warn("[GeminiLiveClient] No responses to send for", calls.length, "tool calls");
    return;
  }

  console.log("[GeminiLiveClient] Sending", responses.length, "tool responses to provider");
  sendToolResponses(responses);
}

interface RunSingleToolCallOptions {
  call: FunctionCall;
  tools: ToolDefinition[];
  context: ToolContext;
  backgroundToolNamesThisTurn: Set<string>;
  onToolExecuted?: (toolName: string, result: unknown) => void;
  onError?: (error: VoiceChatError) => void;
}

function runSingleToolCall(options: RunSingleToolCallOptions): Promise<FunctionResponse> {
  const {
    call,
    tools,
    context,
    backgroundToolNamesThisTurn,
    onToolExecuted,
    onError,
  } = options;

  const systemTool = SYSTEM_TOOLS.find((tool) => tool.name === call.name);

  if (systemTool) {
    const isBackground = backgroundToolNamesThisTurn.has(call.name);
    if (isBackground) {
      return runBackgroundSystemTool({
        call,
        context,
        onToolExecuted,
        onError,
        execute: () => systemTool.execute(call.args, context),
      });
    }

    return Promise.resolve(systemTool.execute(call.args, context)).then(
      (executeResult) => {
        onToolExecuted?.(call.name, executeResult.result);
        return {
          id: call.id,
          name: call.name,
          response: { result: JSON.stringify(executeResult.result) },
        };
      },
      (error) => {
        const toolError = error instanceof Error ? error : new Error(String(error));
        console.error(`[GeminiLiveClient] Error executing system tool "${call.name}":`, toolError);
        return {
          id: call.id,
          name: call.name,
          response: { result: "", error: toolError.message },
        };
      }
    );
  }

  const userTool = tools.find((tool) => tool.name === call.name);
  if (userTool) {
    return Promise.resolve(userTool.execute(call.args)).then(
      (result) => {
        onToolExecuted?.(call.name, result);
        return {
          id: call.id,
          name: call.name,
          response: { result: JSON.stringify(result) },
        };
      },
      (error) => {
        const toolError = error instanceof Error ? error : new Error(String(error));
        console.error(`[GeminiLiveClient] Error executing user tool "${call.name}":`, toolError);
        return {
          id: call.id,
          name: call.name,
          response: { result: "", error: toolError.message },
        };
      }
    );
  }

  console.error(`[GeminiLiveClient] Tool "${call.name}" not found`);
  return Promise.resolve({
    id: call.id,
    name: call.name,
    response: { result: "", error: `Tool "${call.name}" not found` },
  });
}

interface BackgroundSystemToolOptions {
  call: FunctionCall;
  context: ToolContext;
  execute: () => Promise<{ result: unknown }> | { result: unknown };
  onToolExecuted?: (toolName: string, result: unknown) => void;
  onError?: (error: VoiceChatError) => void;
}

function runBackgroundSystemTool(options: BackgroundSystemToolOptions): Promise<FunctionResponse> {
  const { call, execute, onToolExecuted, onError } = options;

  const isSearchTool = MEMORY_SEARCH_TOOL_NAMES.has(call.name);
  const syntheticMessage = isSearchTool
    ? "Ricerca eseguita in background per deduplicazione. Procedi con create; non attendere risultati."
    : "Operazione avviata in background. Puoi continuare a parlare.";

  Promise.resolve(execute())
    .then((result) => {
      onToolExecuted?.(call.name, result.result);
    })
    .catch((error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(
        `[GeminiLiveClient] Background tool "${call.name}" failed:`,
        errorMessage
      );
      onError?.(
        new VoiceChatError(
          `Operazione memoria in background fallita: ${errorMessage}`,
          "API_ERROR",
          false
        )
      );
    });

  return Promise.resolve({
    id: call.id,
    name: call.name,
    response: {
      result: JSON.stringify({
        ok: true,
        message: syntheticMessage,
      }),
    },
  });
}
