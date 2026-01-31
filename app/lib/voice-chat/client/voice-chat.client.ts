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
  BACKGROUND_MEMORY_WRITE_TOOL_NAMES,
  MEMORY_SEARCH_TOOL_NAMES,
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
        // Non interrompiamo qui basandoci sull'audio level perché:
        // 1. Il microfono può rilevare l'audio dell'altoparlante (feedback)
        // 2. Gemini invia l'evento "interrupted" quando rileva speech dell'utente
        // L'interruzione viene gestita dal listener "interrupted" del provider
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
      this.audioOutput?.flush();
      this.options.onTurnComplete?.();
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
    console.log('[VoiceChatClient] handleToolCalls called with', calls.length, 'calls:', calls.map(c => c.name));

    const toolContext: ToolContext = {
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
      clearConversation: () => {
        this.options.onClearConversation?.();
      },
      switchToChat: this.options.onSwitchToChat
        ? (chatId: string) => {
            this.options.onSwitchToChat?.(chatId);
          }
        : undefined,
    };

    // Search in background solo se nello stesso turn c'è un write (deduplicazione).
    // Se l'utente chiede solo "cerca nelle memorie" la search è bloccante per dare la risposta corretta.
    const hasMemoryWriteInTurn = calls.some((c) =>
      BACKGROUND_MEMORY_WRITE_TOOL_NAMES.has(c.name)
    );
    const backgroundToolNamesThisTurn = new Set(BACKGROUND_MEMORY_WRITE_TOOL_NAMES);
    if (hasMemoryWriteInTurn) {
      MEMORY_SEARCH_TOOL_NAMES.forEach((n) => backgroundToolNamesThisTurn.add(n));
    }

    const responsePromises = calls.map((call) =>
      this.runSingleToolCall(call, toolContext, backgroundToolNamesThisTurn)
    );
    const responses = await Promise.all(responsePromises);

    if (responses.length > 0) {
      console.log('[VoiceChatClient] Sending', responses.length, 'tool responses to provider');
      this.provider.sendToolResponse(responses);
    } else {
      console.warn('[VoiceChatClient] No responses to send for', calls.length, 'tool calls');
    }
  }

  /**
   * Esegue un singolo tool e restituisce una promise della risposta da inviare a Gemini.
   * Per i tool in backgroundToolNamesThisTurn la promise risolve subito (risposta sintetica)
   * e l'operazione reale prosegue in background.
   */
  private runSingleToolCall(
    call: FunctionCall,
    toolContext: ToolContext,
    backgroundToolNamesThisTurn: Set<string>
  ): Promise<FunctionResponse> {
    const systemTool = SYSTEM_TOOLS.find((t) => t.name === call.name);
    if (systemTool) {
      const isBackground = backgroundToolNamesThisTurn.has(call.name);
      if (isBackground) {
        const isSearch = MEMORY_SEARCH_TOOL_NAMES.has(call.name);
        const syntheticMessage = isSearch
          ? "Ricerca eseguita in background per deduplicazione. Procedi con create; non attendere risultati."
          : "Operazione avviata in background. Puoi continuare a parlare.";
        const synthetic: FunctionResponse = {
          id: call.id,
          name: call.name,
          response: {
            result: JSON.stringify({
              ok: true,
              message: syntheticMessage,
            }),
          },
        };
        const executePromise = Promise.resolve(
          systemTool.execute(call.args, toolContext)
        );
        executePromise
          .then((res: { result: unknown }) => {
            this.options.onToolExecuted?.(call.name, res.result);
          })
          .catch((err: unknown) => {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.error(
              `[VoiceChatClient] Background tool "${call.name}" failed:`,
              errMsg
            );
            this.options.onError?.(
              new VoiceChatError(
                `Operazione memoria in background fallita: ${errMsg}`,
                "API_ERROR",
                false
              )
            );
          });
        return Promise.resolve(synthetic);
      }
      // Tool bloccante: attendiamo il risultato
      return Promise.resolve(systemTool.execute(call.args, toolContext)).then(
        (executeResult) => {
          console.log('[VoiceChatClient] Tool', call.name, 'executed successfully');
          this.options.onToolExecuted?.(call.name, executeResult.result);
          return {
            id: call.id,
            name: call.name,
            response: { result: JSON.stringify(executeResult.result) },
          };
        },
        (error) => {
          const toolError = error instanceof Error ? error : new Error(String(error));
          console.error(`[VoiceChatClient] Error executing system tool "${call.name}":`, toolError);
          return {
            id: call.id,
            name: call.name,
            response: { result: "", error: toolError.message },
          };
        }
      );
    }

    const userTool = this.tools.find((t) => t.name === call.name);
    if (userTool) {
      return Promise.resolve(userTool.execute(call.args)).then(
        (result) => {
          this.options.onToolExecuted?.(call.name, result);
          return {
            id: call.id,
            name: call.name,
            response: { result: JSON.stringify(result) },
          };
        },
        (error) => {
          const toolError = error instanceof Error ? error : new Error(String(error));
          console.error(`[VoiceChatClient] Error executing user tool "${call.name}":`, toolError);
          return {
            id: call.id,
            name: call.name,
            response: { result: "", error: toolError.message },
          };
        }
      );
    }

    console.error(`[VoiceChatClient] Tool "${call.name}" not found`);
    return Promise.resolve({
      id: call.id,
      name: call.name,
      response: { result: "", error: `Tool "${call.name}" not found` },
    });
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
