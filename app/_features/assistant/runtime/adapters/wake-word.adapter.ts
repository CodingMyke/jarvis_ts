import { startWakeWordLifecycle } from "@/app/_features/assistant/lib/wake-word-lifecycle";
import type {
  VoiceChatWakeWordManager,
  VoiceChatWakeWordOptions,
} from "../voice-chat-runtime.types";

export function createWakeWordAdapter(
  options: VoiceChatWakeWordOptions,
): VoiceChatWakeWordManager {
  return startWakeWordLifecycle({
    keyword: options.keyword,
    language: options.language,
    onWakeWord: options.onWakeWord,
    onError: options.onError,
  });
}
