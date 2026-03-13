import { VoiceChatError } from "../types/client.types";
import { WakeWordManager } from "./audio/wake-word.manager";

interface StartWakeWordLifecycleOptions {
  keyword: string;
  language: string;
  onWakeWord: (transcript: string) => void;
  onError: (error: VoiceChatError) => void;
}

/**
 * Creates and starts local wake-word listening lifecycle.
 */
export function startWakeWordLifecycle(
  options: StartWakeWordLifecycleOptions
): WakeWordManager {
  const manager = new WakeWordManager({
    keyword: options.keyword,
    language: options.language,
    onWakeWord: options.onWakeWord,
    onError: (error) => {
      options.onError(new VoiceChatError(error.message, "AUDIO_ERROR", true));
    },
  });

  manager.start();
  return manager;
}

export function stopWakeWordLifecycle(manager: WakeWordManager | null): void {
  manager?.dispose();
}
