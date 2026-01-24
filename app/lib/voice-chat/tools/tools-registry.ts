import type { ToolDefinition, FunctionCall, FunctionResponse } from '../types/tools.types';
import type { Tool, FunctionDeclaration } from '../types/messages.types';

/**
 * Registro per i tools (function calling).
 * Inizialmente vuoto, predisposto per aggiungere tools in futuro.
 */
export class ToolsRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  /**
   * Registra un nuovo tool
   */
  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Rimuove un tool dal registro
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Verifica se un tool esiste
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Ottiene le dichiarazioni in formato Gemini API
   */
  getDeclarations(): Tool[] {
    if (this.tools.size === 0) {
      return [];
    }

    const declarations: FunctionDeclaration[] = [];
    
    for (const tool of this.tools.values()) {
      declarations.push({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters ? {
          type: 'object',
          properties: tool.parameters.properties,
          required: tool.parameters.required,
        } : undefined,
      });
    }

    return [{
      functionDeclarations: declarations,
    }];
  }

  /**
   * Esegue una function call
   */
  async execute(call: FunctionCall): Promise<FunctionResponse> {
    const tool = this.tools.get(call.name);
    
    if (!tool) {
      return {
        id: call.id,
        name: call.name,
        response: {
          result: '',
          error: `Tool "${call.name}" not found`,
        },
      };
    }

    try {
      const result = await tool.execute(call.args);
      return {
        id: call.id,
        name: call.name,
        response: {
          result: JSON.stringify(result),
        },
      };
    } catch (error) {
      return {
        id: call.id,
        name: call.name,
        response: {
          result: '',
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Esegue multiple function calls in parallelo
   */
  async executeAll(calls: FunctionCall[]): Promise<FunctionResponse[]> {
    return Promise.all(calls.map(call => this.execute(call)));
  }

  get isEmpty(): boolean {
    return this.tools.size === 0;
  }

  get size(): number {
    return this.tools.size;
  }
}
