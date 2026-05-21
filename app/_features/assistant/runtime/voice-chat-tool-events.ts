import type {
  VoiceChatRuntimeToolExecutedEvent,
  VoiceChatRuntimeToolExecutedListener,
} from "./voice-chat-runtime.types";

export interface VoiceChatToolEvents {
  emit(event: VoiceChatRuntimeToolExecutedEvent): void;
  subscribe(listener: VoiceChatRuntimeToolExecutedListener): () => void;
  clear(): void;
}

export function createVoiceChatToolEvents(): VoiceChatToolEvents {
  const listeners = new Set<VoiceChatRuntimeToolExecutedListener>();

  return {
    emit(event) {
      let firstError: unknown = null;

      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          firstError ??= error;
        }
      }

      if (firstError) {
        throw firstError;
      }
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    clear() {
      listeners.clear();
    },
  };
}
