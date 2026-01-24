export interface ParameterProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters?: {
    type: 'object';
    properties: Record<string, ParameterProperty>;
    required?: string[];
  };
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
