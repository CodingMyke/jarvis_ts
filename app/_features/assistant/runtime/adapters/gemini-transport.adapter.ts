import { GeminiProvider } from "@/app/_features/assistant/lib/providers/gemini";
import { VoiceChatClient } from "@/app/_features/assistant/lib/transport";
import { JARVIS_CONFIG } from "@/app/_features/assistant/lib/jarvis.config";
import type {
  VoiceChatRuntimeAssistantConfig,
  VoiceChatTransport,
  VoiceChatTransportCallbacks,
} from "../voice-chat-runtime.types";

export function createGeminiTransportAdapter(
  callbacks: VoiceChatTransportCallbacks,
  assistantConfig: Partial<VoiceChatRuntimeAssistantConfig> = {},
): VoiceChatTransport {
  const provider = new GeminiProvider();
  const config = {
    voice: assistantConfig.voice ?? JARVIS_CONFIG.voice,
    language: assistantConfig.language ?? JARVIS_CONFIG.language,
    systemPrompt: assistantConfig.systemPrompt ?? JARVIS_CONFIG.systemPrompt,
  };

  const client = new VoiceChatClient({
    provider,
    config,
    tools: [],
    onTranscript: callbacks.onTranscript,
    onToolExecuted: callbacks.onToolExecuted,
    onStateChange: callbacks.onStateChange,
    onError: callbacks.onError,
    onAudioLevel: callbacks.onAudioLevel,
    onOutputAudioLevel: callbacks.onOutputAudioLevel,
    onEndConversation: callbacks.onEndConversation,
    onTurnComplete: callbacks.onTurnComplete,
    onDisableCompletely: callbacks.onDisableCompletely,
    onDeleteCurrentChat: callbacks.onDeleteCurrentChat,
    onDeleteChatById: callbacks.onDeleteChatById,
    onSwitchToChat: callbacks.onSwitchToChat,
    onCreateNewChat: callbacks.onCreateNewChat,
    getIsCurrentChatEmpty: callbacks.getIsCurrentChatEmpty,
    getCurrentChatContext: callbacks.getCurrentChatContext,
  });

  return {
    connect() {
      return client.connect();
    },
    dispose() {
      client.dispose();
    },
    sendHistory(turns, turnComplete = false) {
      client.sendHistory(turns, turnComplete);
    },
    sendText(text) {
      client.sendText(text);
    },
    setMuted(muted) {
      client.setMuted(muted);
    },
    startListening() {
      return client.startListening();
    },
  };
}
