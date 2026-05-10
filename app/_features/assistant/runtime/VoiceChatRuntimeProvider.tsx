"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createVoiceChatRuntime } from "@/app/_features/assistant/lib";
import type { VoiceChatRuntime } from "./voice-chat-runtime.types";

const VoiceChatRuntimeContext = createContext<VoiceChatRuntime | null>(null);

export function VoiceChatRuntimeProvider({ children }: { children: ReactNode }) {
  const [runtime] = useState<VoiceChatRuntime>(() => createVoiceChatRuntime());

  useEffect(() => {
    return () => {
      runtime.dispose();
    };
  }, [runtime]);

  return (
    <VoiceChatRuntimeContext.Provider value={runtime}>
      {children}
    </VoiceChatRuntimeContext.Provider>
  );
}

export function useVoiceChatRuntimeContext(): VoiceChatRuntime {
  const runtime = useContext(VoiceChatRuntimeContext);
  if (!runtime) {
    throw new Error("useVoiceChatRuntime must be used within VoiceChatRuntimeProvider");
  }

  return runtime;
}
