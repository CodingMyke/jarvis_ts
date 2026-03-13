import type { VoiceChatProvider } from "../providers/base.provider";
import type { SessionConfig } from "../../types/messages.types";
import type { ToolDefinition } from "../../types/tools.types";
import type { ConversationTurn } from "../storage/types";
import {
  VoiceChatError,
  type ConnectionState,
  type VoiceChatClientOptions,
} from "../../types/client.types";
import type { AudioFormat } from "../../types/audio.types";
import { AudioInputManager } from "../audio/audio-input.manager";
import { AudioOutputManager } from "../audio/audio-output.manager";
import {
  AUDIO_CHUNK_INTERVAL_MS,
  AUDIO_OUTPUT_SAMPLE_RATE,
  DEFAULT_AUDIO_FORMAT,
  GEMINI_MODEL,
} from "../config/default.config";
import { SYSTEM_TOOL_DECLARATIONS, type ToolContext } from "../../tools";
import { dispatchToolCalls } from "./tool-dispatcher";

/**
 * Client principale per la voice chat Gemini Live.
 * Coordina provider, audio I/O e gestione dello stato.
 */
export class GeminiLiveClient {
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
      throw new VoiceChatError("GEMINI_API_KEY not configured", "API_ERROR", false);
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
        false
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
        this.options.onError?.(new VoiceChatError(error.message, "AUDIO_ERROR", true));
      },
      onLevelChange: (level) => {
        this.options.onAudioLevel?.(level);
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

  sendText(text: string): void {
    if (this.state !== "connected") return;
    this.provider.sendText(text);
  }

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
      this.audioOutput?.flush();
      this.options.onTurnComplete?.();
    });

    this.provider.on("interrupted", () => {
      this.audioOutput?.clear();
    });

    this.provider.on("toolCall", ({ calls }) => {
      const toolContext = this.buildToolContext();
      void dispatchToolCalls({
        calls,
        tools: this.tools,
        context: toolContext,
        onToolExecuted: this.options.onToolExecuted,
        onError: this.options.onError,
        sendToolResponses: (responses) => this.provider.sendToolResponse(responses),
      });
    });

    this.provider.on("error", ({ error }) => {
      this.options.onError?.(error);
    });

    this.provider.on("disconnected", () => {
      this.setState("disconnected");
    });
  }

  private buildToolContext(): ToolContext {
    return {
      endConversation: (delayMs = 0) => {
        setTimeout(() => {
          this.options.onEndConversation?.();
        }, delayMs);
      },
      disableCompletely: (delayMs = 0) => {
        setTimeout(() => {
          this.options.onDisableCompletely?.();
        }, delayMs);
      },
      deleteCurrentChat: () =>
        this.options.onDeleteCurrentChat?.() ??
        Promise.resolve({ success: false, error: "Non disponibile" }),
      deleteChatById: this.options.onDeleteChatById
        ? (id: string) => this.options.onDeleteChatById!(id)
        : undefined,
      switchToChat: this.options.onSwitchToChat
        ? (chatId: string) => this.options.onSwitchToChat!(chatId)
        : undefined,
      createNewChat: this.options.onCreateNewChat
        ? () => {
            this.options.onCreateNewChat?.();
          }
        : undefined,
      getIsCurrentChatEmpty: this.options.getIsCurrentChatEmpty,
    };
  }

  private initAudioOutput(): void {
    this.audioOutput = new AudioOutputManager({
      format: {
        sampleRate: AUDIO_OUTPUT_SAMPLE_RATE,
        channels: 1,
        bitDepth: 16,
      },
      onLevelChange: (level) => {
        this.options.onOutputAudioLevel?.(level);
      },
      onError: (error) => {
        this.options.onError?.(new VoiceChatError(error.message, "AUDIO_ERROR", true));
      },
    });
  }

  private buildSessionConfig(): SessionConfig {
    const config = this.options.config || {};

    const allToolDeclarations = [
      ...SYSTEM_TOOL_DECLARATIONS,
      ...this.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      })),
    ];

    let systemText = config.systemPrompt ?? "";
    const context = this.options.getCurrentChatContext?.() ?? null;
    if (context) {
      const created = formatChatContextDate(context.created_at);
      const lastActivity = formatChatContextDate(context.last_activity_at);
      systemText += `\n\nCONVERSAZIONE CORRENTE (informazioni sempre valide):\n- ID chat: ${context.id}\n- Titolo: ${context.title?.trim() || "(nessuno)"}\n- Creata il: ${created}\n- Ultimo messaggio inviato dall'utente: ${lastActivity}\n`;
    }

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
      systemInstruction: systemText ? { parts: [{ text: systemText }] } : undefined,
      tools: [{ functionDeclarations: allToolDeclarations }],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    };
  }
}

function formatChatContextDate(iso: string): string {
  if (!iso?.trim()) return "non disponibile";
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "non disponibile";
    return date.toLocaleString("it-IT", { dateStyle: "long", timeStyle: "short" });
  } catch {
    return "non disponibile";
  }
}

export { GeminiLiveClient as VoiceChatClient };
