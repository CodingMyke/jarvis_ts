import {
  appendChatTurns,
  createChat,
  deleteChatById,
  fetchChatById,
} from "./adapters/chat-persistence.adapter";
import { createGeminiTransportAdapter } from "./adapters/gemini-transport.adapter";
import { createWakeWordAdapter } from "./adapters/wake-word.adapter";
import { createVoiceChatChatManager } from "./voice-chat-chat-manager";
import { createVoiceChatSessionController, resolveAssistantConfig } from "./voice-chat-session-controller";
import type {
  VoiceChatRuntime,
  VoiceChatRuntimeDependencies,
} from "./voice-chat-runtime.types";
import { createVoiceChatRuntimeStore } from "./voice-chat-runtime.store";
import { createVoiceChatToolEvents } from "./voice-chat-tool-events";

export function createVoiceChatRuntime(
  dependencies: VoiceChatRuntimeDependencies = {},
): VoiceChatRuntime {
  const store = createVoiceChatRuntimeStore();
  const assistantConfig = resolveAssistantConfig(dependencies.assistantConfig);
  const toolEvents = createVoiceChatToolEvents();
  const persistence = {
    appendChatTurns: dependencies.appendChatTurns ?? appendChatTurns,
    createChat: dependencies.createChat ?? createChat,
    deleteChatById: dependencies.deleteChatById ?? deleteChatById,
    fetchChatById: dependencies.fetchChatById ?? fetchChatById,
  };

  if (dependencies.initialChatId) {
    store.setChatId(dependencies.initialChatId);
  }

  const chatManager = createVoiceChatChatManager({
    store,
    ...persistence,
  });
  const sessionController = createVoiceChatSessionController({
    assistantConfig,
    chatManager,
    createTransport: dependencies.createTransport
      ?? ((callbacks) => createGeminiTransportAdapter(callbacks, assistantConfig)),
    createWakeWord: dependencies.createWakeWord ?? createWakeWordAdapter,
    emitToolExecuted: (event) => {
      toolEvents.emit(event);
    },
    fetchChatById: persistence.fetchChatById,
    store,
  });

  return {
    getSnapshot() {
      return store.getSnapshot();
    },
    subscribe(listener) {
      return store.subscribe(listener);
    },
    subscribeToolExecuted(listener) {
      return toolEvents.subscribe(listener);
    },
    startListening() {
      sessionController.startListening();
    },
    stopListening() {
      sessionController.stopListening();
    },
    toggleMute() {
      sessionController.toggleMute();
    },
    async deleteCurrentChat() {
      await sessionController.deleteCurrentChat();
    },
    dispose() {
      sessionController.dispose();
      toolEvents.clear();
    },
  };
}
