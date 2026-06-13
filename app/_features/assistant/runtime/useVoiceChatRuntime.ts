"use client";

import { useVoiceChatRuntimeContext } from "./VoiceChatRuntimeProvider";
import type { VoiceChatRuntime } from "./voice-chat-runtime.types";

export function useVoiceChatRuntime(): VoiceChatRuntime {
  return useVoiceChatRuntimeContext();
}
