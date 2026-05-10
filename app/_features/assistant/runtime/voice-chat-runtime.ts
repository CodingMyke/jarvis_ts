import { createVoiceChatToolEvents } from "./voice-chat-tool-events";
import type {
  VoiceChatRuntime,
  VoiceChatRuntimeDependencies,
  VoiceChatRuntimeListener,
  VoiceChatRuntimeSnapshot,
} from "./voice-chat-runtime.types";

const DEFAULT_SNAPSHOT: VoiceChatRuntimeSnapshot = {
  connectionState: "disconnected",
  listeningMode: "idle",
  isMuted: false,
  messages: [],
  audioLevel: 0,
  outputAudioLevel: 0,
  error: null,
  chatId: null,
  chatTitle: null,
};

export function createVoiceChatRuntime(
  _dependencies: VoiceChatRuntimeDependencies = {},
): VoiceChatRuntime {
  const listeners = new Set<VoiceChatRuntimeListener>();
  const toolEvents = createVoiceChatToolEvents();
  const snapshot: VoiceChatRuntimeSnapshot = { ...DEFAULT_SNAPSHOT };

  return {
    getSnapshot() {
      return {
        ...snapshot,
        messages: snapshot.messages.map((message) => ({ ...message })),
      };
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    subscribeToolExecuted(listener) {
      return toolEvents.subscribe(listener);
    },
    startListening() {},
    stopListening() {},
    toggleMute() {},
    async deleteCurrentChat() {},
    dispose() {
      listeners.clear();
      toolEvents.clear();
    },
  };
}
