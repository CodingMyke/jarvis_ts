import type { VoiceChatProvider } from "../providers/base.provider";
import type { SessionConfig } from "../types/messages.types";
import type { ToolDefinition, FunctionCall, FunctionResponse } from "../types/tools.types";
import type { ConversationTurn } from "../storage/types";
import {
  VoiceChatError,
  type ConnectionState,
  type VoiceChatClientOptions,
} from "../types/client.types";
import type { AudioFormat } from "../types/audio.types";
import { AudioInputManager } from "../audio/audio-input.manager";
import { AudioOutputManager } from "../audio/audio-output.manager";
import { AUDIO_CHUNK_INTERVAL_MS, AUDIO_OUTPUT_SAMPLE_RATE, DEFAULT_AUDIO_FORMAT, GEMINI_MODEL } from "../config/default.config";
import {
  SYSTEM_TOOLS,
  SYSTEM_TOOL_DECLARATIONS,
  type ToolContext,
} from "../tools";


/**
 * Client principale per la voice chat.
 * Coordina provider, audio I/O e gestione dello stato.
 */
export class VoiceChatClient {
  private provider: VoiceChatProvider;
  private audioInput: AudioInputManager | null = null;
  private audioOutput: AudioOutputManager | null = null;

  private state: ConnectionState = "disconnected";
  private options: VoiceChatClientOptions;
  private tools: ToolDefinition[];

  constructor(options: VoiceChatClientOptions) {
    this.options = options;
    this.provider = options.provider;
    this.tools = options.tools || [];

    this.setupProviderListeners();
  }

  async connect(): Promise<void> {
    if (this.state !== "disconnected") return;

    this.setState("connecting");

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new VoiceChatError(
        "GEMINI_API_KEY not configured",
        "API_ERROR",
        false,
      );
    }

    const config = this.buildSessionConfig();

    try {
      await this.provider.connect(config, apiKey);
      this.initAudioOutput();
      this.setState("connected");
    } catch (error) {
      this.setState("disconnected");
      throw error;
    }
  }

  async startListening(): Promise<void> {
    if (this.state !== "connected") {
      throw new VoiceChatError(
        "Must be connected before starting to listen",
        "API_ERROR",
        false,
      );
    }

    const format: AudioFormat = DEFAULT_AUDIO_FORMAT;

    this.audioInput = new AudioInputManager({
      format,
      chunkIntervalMs: AUDIO_CHUNK_INTERVAL_MS,
      onChunk: (chunk) => {
        this.provider.sendAudio(chunk.data);
      },
      onError: (error) => {
        this.options.onError?.(
          new VoiceChatError(error.message, "AUDIO_ERROR", true),
        );
      },
      onLevelChange: (level) => {
        this.options.onAudioLevel?.(level);
        
        // Interrompi immediatamente la riproduzione se l'utente sta parlando
        // Soglia di 0.05 per evitare falsi positivi dal rumore di fondo
        if (level > 0.05 && this.audioOutput?.playing) {
          this.audioOutput.clear();
        }
      },
    });

    await this.audioInput.start();
  }

  stopListening(): void {
    this.audioInput?.stop();
  }

  setMuted(muted: boolean): void {
    this.audioInput?.setMuted(muted);
  }

  /**
   * Invia un messaggio di testo a Gemini.
   * Utile per inviare il messaggio iniziale dopo il wake word.
   */
  sendText(text: string): void {
    if (this.state !== "connected") return;
    this.provider.sendText(text);
  }

  /**
   * Invia la history della conversazione precedente.
   * Da chiamare subito dopo connect() e prima di sendText().
   * @param turns - I turni della conversazione precedente
   * @param turnComplete - Se false (default), il modello aspetta altro input
   */
  sendHistory(turns: ConversationTurn[], turnComplete = false): void {
    if (this.state !== "connected") return;
    this.provider.sendHistory(turns, turnComplete);
  }

  dispose(): void {
    this.audioInput?.dispose();
    this.audioOutput?.dispose();
    this.provider.dispose();
    this.setState("disconnected");
  }

  get connectionState(): ConnectionState {
    return this.state;
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.options.onStateChange?.(state);
  }

  private setupProviderListeners(): void {
    this.provider.on("transcript", ({ text, type }) => {
      this.options.onTranscript?.(text, type);
    });

    this.provider.on("audio", ({ data }) => {
      this.audioOutput?.playChunk(data);
    });

    this.provider.on("turnComplete", () => {
      // Flush remaining audio chunks when turn is complete
      this.audioOutput?.flush();
    });

    this.provider.on("interrupted", () => {
      // Interrompi immediatamente la riproduzione quando l'utente parla
      this.audioOutput?.clear();
    });

    this.provider.on("toolCall", ({ calls }) => {
      this.handleToolCalls(calls);
    });

    this.provider.on("error", ({ error }) => {
      this.options.onError?.(error);
    });

    this.provider.on("disconnected", () => {
      this.setState("disconnected");
    });
  }

  private async handleToolCalls(calls: FunctionCall[]): Promise<void> {
    const responses: FunctionResponse[] = [];

    // Contesto con le azioni disponibili per i tools
    const toolContext: ToolContext = {
      endConversation: (delayMs = 0) => {
        setTimeout(() => {
          this.options.onEndConversation?.();
        }, delayMs);
      },
    };

    for (const call of calls) {
      // Cerca prima nei tools di sistema
      const systemTool = SYSTEM_TOOLS.find((t) => t.name === call.name);
      if (systemTool) {
        try {
          const executeResult = await systemTool.execute(call.args, toolContext);
          responses.push({
            id: call.id,
            name: call.name,
            response: { result: JSON.stringify(executeResult.result) },
          });
        } catch (error) {
          responses.push({
            id: call.id,
            name: call.name,
            response: {
              result: "",
              error: error instanceof Error ? error.message : String(error),
            },
          });
        }
        continue;
      }

      // Poi cerca nei tools utente
      const userTool = this.tools.find((t) => t.name === call.name);
      if (userTool) {
        try {
          const result = await userTool.execute(call.args);
          responses.push({
            id: call.id,
            name: call.name,
            response: { result: JSON.stringify(result) },
          });
        } catch (error) {
          responses.push({
            id: call.id,
            name: call.name,
            response: {
              result: "",
              error: error instanceof Error ? error.message : String(error),
            },
          });
        }
      } else {
        responses.push({
          id: call.id,
          name: call.name,
          response: { result: "", error: `Tool "${call.name}" not found` },
        });
      }
    }

    if (responses.length > 0) {
      this.provider.sendToolResponse(responses);
    }
  }

  private initAudioOutput(): void {
    this.audioOutput = new AudioOutputManager({
      format: {
        sampleRate: AUDIO_OUTPUT_SAMPLE_RATE,
        channels: 1,
        bitDepth: 16,
      },
      onError: (error) => {
        this.options.onError?.(
          new VoiceChatError(error.message, "AUDIO_ERROR", true),
        );
      },
    });
  }

  private buildSessionConfig(): SessionConfig {
    const config = this.options.config || {};

    // Combina tools di sistema con tools utente
    const allToolDeclarations = [
      ...SYSTEM_TOOL_DECLARATIONS,
      ...this.tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    ];

    return {
      model: `models/${GEMINI_MODEL}`,
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: config.voice || "Kore",
            },
          },
        },
      },
      systemInstruction: config.systemPrompt
        ? { parts: [{ text: config.systemPrompt }] }
        : undefined,
      tools: [{ functionDeclarations: allToolDeclarations }],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    };
  }
}
