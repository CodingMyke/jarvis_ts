import type { VoiceChatProvider } from "../providers/base.provider";
import type { SessionConfig } from "../types/messages.types";
import type { ToolDefinition } from "../types/tools.types";
import {
  VoiceChatError,
  type ConnectionState,
  type VoiceChatClientOptions,
  type AudioFormat,
} from "../types/client.types";
import { AudioInputManager } from "../audio/audio-input.manager";
import { AudioOutputManager } from "../audio/audio-output.manager";
import { AUDIO_CHUNK_INTERVAL_MS, AUDIO_OUTPUT_SAMPLE_RATE, DEFAULT_AUDIO_FORMAT } from "../config/default.config";


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
      onLevelChange: this.options.onAudioLevel,
    });

    await this.audioInput.start();
  }

  stopListening(): void {
    this.audioInput?.stop();
  }

  setMuted(muted: boolean): void {
    this.audioInput?.setMuted(muted);
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

    this.provider.on("error", ({ error }) => {
      this.options.onError?.(error);
    });

    this.provider.on("disconnected", () => {
      this.setState("disconnected");
    });
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

    return {
      model: "models/gemini-2.0-flash-exp",
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
      tools:
        this.tools.length > 0
          ? [
              {
                functionDeclarations: this.tools.map((t) => ({
                  name: t.name,
                  description: t.description,
                  parameters: t.parameters,
                })),
              },
            ]
          : undefined,
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    };
  }
}
