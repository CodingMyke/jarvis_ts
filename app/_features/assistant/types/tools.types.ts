import type {
  ToolParametersSchema,
  ToolSchemaProperty as ParameterProperty,
} from "@/app/_features/assistant/tools/tool-schema";

export type { ParameterProperty, ToolParametersSchema };

export interface ToolDefinition {
  name: string;
  description: string;
  parameters?: ToolParametersSchema;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface FunctionCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface FunctionResponse {
  id: string;
  name: string;
  response: {
    result: string;
    error?: string;
  };
}
