import { JARVIS_CONFIG } from "@/app/_features/assistant/lib/jarvis.config";
import type { ConversationTurn } from "@/app/_features/assistant/lib/storage";
import type { Message } from "@/app/_features/assistant/types/speech.types";
import { VoiceChatError } from "@/app/_features/assistant/types/client.types";
import type { VoiceChatChatManager } from "./voice-chat-chat-manager";
import type { VoiceChatRuntimeStore } from "./voice-chat-runtime.store";
import type {
  VoiceChatRuntimeAssistantConfig,
  VoiceChatRuntimeToolExecutedEvent,
  VoiceChatTransport,
  VoiceChatTransportCallbacks,
  VoiceChatWakeWordManager,
  VoiceChatWakeWordOptions,
} from "./voice-chat-runtime.types";

const DELETE_AND_RECONNECT_DELAY_MS = 400;
const INACTIVITY_MS = 20_000;

function isCurrentChatEffectivelyEmpty(messages: Message[]): boolean {
  if (messages.length === 0) return true;
  if (messages.length === 1) {
    const [message] = messages;
    return message.isUser && (message.text.trim().length ?? 0) <= 50;
  }
  if (messages.length === 2) {
    const userMessage = messages.find((message) => message.isUser);
    const assistantMessage = messages.find((message) => !message.isUser);
    const userIsShort = (userMessage?.text.trim().length ?? 0) <= 80;
    const assistantIsShort = (assistantMessage?.text.trim().length ?? 0) <= 80;
    return Boolean(userMessage && assistantMessage && userIsShort && assistantIsShort);
  }

  return false;
}

function cloneMessages(messages: Message[]): Message[] {
  return messages.map((message) => ({ ...message }));
}

interface VoiceChatSessionControllerDependencies {
  assistantConfig: VoiceChatRuntimeAssistantConfig;
  chatManager: VoiceChatChatManager;
  createTransport(callbacks: VoiceChatTransportCallbacks): VoiceChatTransport;
  createWakeWord(options: VoiceChatWakeWordOptions): VoiceChatWakeWordManager;
  emitToolExecuted(event: VoiceChatRuntimeToolExecutedEvent): void;
  fetchChatById(chatId: string): Promise<{ success: boolean; message?: string } | null>;
  store: VoiceChatRuntimeStore;
}

export interface VoiceChatSessionController {
  deleteCurrentChat(): Promise<void>;
  dispose(): void;
  startListening(): void;
  stopListening(): void;
  toggleMute(): void;
}

export function createVoiceChatSessionController(
  dependencies: VoiceChatSessionControllerDependencies,
): VoiceChatSessionController {
  let inactivityTimeout: ReturnType<typeof setTimeout> | null = null;
  let transport: VoiceChatTransport | null = null;
  let wakeWordManager: VoiceChatWakeWordManager | null = null;

  const clearInactivityTimeout = () => {
    if (inactivityTimeout) {
      clearTimeout(inactivityTimeout);
      inactivityTimeout = null;
    }
  };

  const resetTransportState = () => {
    dependencies.store.setMuted(false);
    dependencies.store.setAudioLevel(0);
    dependencies.store.setOutputAudioLevel(0);
    dependencies.store.setConnectionState("disconnected");
    dependencies.store.setCurrentMessageIds({ user: null, ai: null });
  };

  const goToWakeWord = () => {
    clearInactivityTimeout();
    void dependencies.chatManager.persistCurrentMessages();
    const currentTransport = transport;
    transport = null;
    currentTransport?.dispose();
    resetTransportState();
    dependencies.store.setListeningMode("wake_word");
    wakeWordManager?.resume();
  };

  const goToIdle = () => {
    clearInactivityTimeout();
    void dependencies.chatManager.persistCurrentMessages();
    wakeWordManager?.dispose();
    wakeWordManager = null;
    const currentTransport = transport;
    transport = null;
    currentTransport?.dispose();
    resetTransportState();
    dependencies.store.setListeningMode("idle");
  };

  const handleTranscript = (text: string, type: "input" | "output" | "thinking") => {
    const snapshot = dependencies.store.getSnapshot();
    const currentIds = dependencies.store.getCurrentMessageIds();
    const messages = cloneMessages(snapshot.messages);

    if (type === "input") {
      clearInactivityTimeout();
      dependencies.store.setCurrentMessageIds({ ai: null });

      if (currentIds.user) {
        dependencies.store.setMessages(
          messages.map((message) =>
            message.id === currentIds.user
              ? { ...message, text: message.text + text }
              : message,
          ),
        );
        return;
      }

      const id = `${Date.now()}-user`;
      dependencies.store.setCurrentMessageIds({ user: id });
      dependencies.store.setMessages([...messages, { id, text, isUser: true }]);
      return;
    }

    dependencies.store.setCurrentMessageIds({ user: null });

    if (currentIds.ai) {
      dependencies.store.setMessages(
        messages.map((message) => {
          if (message.id !== currentIds.ai) {
            return message;
          }

          if (type === "thinking") {
            return {
              ...message,
              thinking: `${message.thinking ?? ""}${text}`,
            };
          }

          return {
            ...message,
            text: message.text + text,
          };
        }),
      );
      return;
    }

    const id = `${Date.now()}-ai`;
    dependencies.store.setCurrentMessageIds({ ai: id });
    dependencies.store.setMessages([
      ...messages,
      {
        id,
        text: type === "output" ? text : "",
        isUser: false,
        thinking: type === "thinking" ? text : undefined,
      },
    ]);
  };

  const connectToTransport = async (initialMessage?: string): Promise<void> => {
    if (transport) {
      return;
    }

    dependencies.store.setError(null);

    try {
      let assistantHistory: ConversationTurn[] = [];
      const hadChatId = Boolean(dependencies.store.getSnapshot().chatId);

      if (hadChatId) {
        assistantHistory = await dependencies.chatManager.loadChat(
          dependencies.store.getSnapshot().chatId!,
        );
      }

      const callbacks: VoiceChatTransportCallbacks = {
        getCurrentChatContext: () => {
          const snapshot = dependencies.store.getSnapshot();
          const metadata = dependencies.store.getChatMetadata();
          if (!snapshot.chatId) {
            return null;
          }

          return {
            id: snapshot.chatId,
            title: snapshot.chatTitle,
            created_at: metadata.createdAt ?? "",
            last_activity_at: metadata.lastActivityAt ?? "",
          };
        },
        getIsCurrentChatEmpty: () =>
          isCurrentChatEffectivelyEmpty(dependencies.store.getSnapshot().messages),
        onAudioLevel: (level) => {
          dependencies.store.setAudioLevel(level);
        },
        onCreateNewChat: () => {
          setTimeout(async () => {
            const result = await dependencies.chatManager.createNewChat();
            if (!result.success) {
              return;
            }

            const currentTransport = transport;
            transport = null;
            currentTransport?.dispose();
            resetTransportState();
            dependencies.store.setListeningMode("wake_word");
            wakeWordManager?.resume();
            setTimeout(() => {
              void connectToTransport();
            }, DELETE_AND_RECONNECT_DELAY_MS);
          }, DELETE_AND_RECONNECT_DELAY_MS);
        },
        onDeleteChatById: (id) => dependencies.chatManager.deleteChatById(id),
        onDeleteCurrentChat: async () => {
          const result = await dependencies.chatManager.deleteCurrentChat();
          if (!result.success) {
            return result;
          }

          setTimeout(() => {
            const currentTransport = transport;
            transport = null;
            currentTransport?.dispose();
            resetTransportState();
            dependencies.store.setListeningMode("wake_word");
            wakeWordManager?.resume();
            setTimeout(() => {
              void connectToTransport(`Ciao ${dependencies.assistantConfig.assistantName}`);
            }, DELETE_AND_RECONNECT_DELAY_MS);
          }, DELETE_AND_RECONNECT_DELAY_MS);

          return result;
        },
        onDisableCompletely: () => {
          goToIdle();
        },
        onEndConversation: () => {
          goToWakeWord();
        },
        onError: (error) => {
          dependencies.store.setError(error);
        },
        onOutputAudioLevel: (level) => {
          dependencies.store.setOutputAudioLevel(level);
        },
        onStateChange: (state) => {
          dependencies.store.setConnectionState(state);

          if (state === "disconnected" && transport) {
            clearInactivityTimeout();
            void dependencies.chatManager.persistCurrentMessages();
            const currentTransport = transport;
            transport = null;
            currentTransport.dispose();
            resetTransportState();
            dependencies.store.setListeningMode("wake_word");
            wakeWordManager?.resume();
          }
        },
        onSwitchToChat: async (chatId) => {
          const response = await dependencies.fetchChatById(chatId);
          if (!response?.success) {
            return {
              success: false,
              error: response?.message ?? "Chat non trovata",
            };
          }

          setTimeout(() => {
            clearInactivityTimeout();
            void dependencies.chatManager.persistCurrentMessages();
            dependencies.chatManager.prepareChatSwitch(chatId);
            const currentTransport = transport;
            transport = null;
            currentTransport?.dispose();
            resetTransportState();
            dependencies.store.setListeningMode("wake_word");
            wakeWordManager?.resume();
            setTimeout(() => {
              void connectToTransport();
            }, DELETE_AND_RECONNECT_DELAY_MS);
          }, DELETE_AND_RECONNECT_DELAY_MS);

          return { success: true };
        },
        onToolExecuted: (toolName, result) => {
          dependencies.emitToolExecuted({ toolName, result });
        },
        onTranscript: handleTranscript,
        onTurnComplete: () => {
          clearInactivityTimeout();
          if (!transport) {
            return;
          }

          inactivityTimeout = setTimeout(() => {
            goToWakeWord();
          }, INACTIVITY_MS);
        },
      };

      const nextTransport = dependencies.createTransport(callbacks);
      transport = nextTransport;

      await nextTransport.connect();
      await nextTransport.startListening();
      dependencies.store.setListeningMode("connected");

      if (assistantHistory.length > 0) {
        nextTransport.sendHistory(assistantHistory, false);
      }

      const hasInitialMessage = Boolean(initialMessage?.trim().length);
      if (!hasInitialMessage || !initialMessage) {
        return;
      }

      const messages = dependencies.store.getSnapshot().messages;
      dependencies.store.setMessages([
        ...messages,
        { id: `${Date.now()}-user`, text: initialMessage, isUser: true },
      ]);
      dependencies.store.setCurrentMessageIds({ user: null, ai: null });
      nextTransport.sendText(initialMessage);

      if (!hadChatId) {
        await dependencies.chatManager.persistCurrentMessages();
      }
    } catch (error) {
      const voiceChatError = error instanceof VoiceChatError
        ? error
        : new VoiceChatError(
            error instanceof Error ? error.message : "Unknown error",
            "UNKNOWN_ERROR",
            false,
          );

      dependencies.store.setError(voiceChatError);
      const currentTransport = transport;
      transport = null;
      currentTransport?.dispose();
      dependencies.store.setListeningMode("wake_word");
      wakeWordManager?.resume();
    }
  };

  if (dependencies.store.getSnapshot().chatId === null) {
    dependencies.store.setChatId(null);
  }

  return {
    async deleteCurrentChat() {
      await (async () => {
        const result = await dependencies.chatManager.deleteCurrentChat();
        if (!result.success) {
          return;
        }

        setTimeout(() => {
          const currentTransport = transport;
          transport = null;
          currentTransport?.dispose();
          resetTransportState();
          dependencies.store.setListeningMode("wake_word");
          wakeWordManager?.resume();
          setTimeout(() => {
            void connectToTransport(`Ciao ${dependencies.assistantConfig.assistantName}`);
          }, DELETE_AND_RECONNECT_DELAY_MS);
        }, DELETE_AND_RECONNECT_DELAY_MS);
      })();
    },
    dispose() {
      clearInactivityTimeout();
      wakeWordManager?.dispose();
      wakeWordManager = null;
      const currentTransport = transport;
      transport = null;
      currentTransport?.dispose();
    },
    startListening() {
      if (dependencies.store.getSnapshot().listeningMode !== "idle") {
        return;
      }

      dependencies.store.setError(null);
      wakeWordManager = dependencies.createWakeWord({
        keyword: dependencies.assistantConfig.wakeWord,
        language: dependencies.assistantConfig.language,
        onWakeWord: async (transcript) => {
          await connectToTransport(transcript);
        },
        onError: (error) => {
          dependencies.store.setError(error);
        },
      });
      dependencies.store.setListeningMode("wake_word");
    },
    stopListening() {
      goToIdle();
    },
    toggleMute() {
      if (!transport) {
        return;
      }

      const nextMuted = !dependencies.store.getSnapshot().isMuted;
      transport.setMuted(nextMuted);
      dependencies.store.setMuted(nextMuted);
    },
  };
}

export function resolveAssistantConfig(
  config: Partial<VoiceChatRuntimeAssistantConfig> = {},
): VoiceChatRuntimeAssistantConfig {
  return {
    assistantName: config.assistantName ?? JARVIS_CONFIG.assistantName,
    language: config.language ?? JARVIS_CONFIG.language,
    systemPrompt: config.systemPrompt ?? JARVIS_CONFIG.systemPrompt,
    voice: config.voice ?? JARVIS_CONFIG.voice,
    wakeWord: config.wakeWord ?? JARVIS_CONFIG.wakeWord,
  };
}
