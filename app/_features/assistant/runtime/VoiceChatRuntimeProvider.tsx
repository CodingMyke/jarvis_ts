"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { createVoiceChatRuntime } from "@/app/_features/assistant/lib";
import type { VoiceChatRuntime } from "./voice-chat-runtime.types";

const VoiceChatRuntimeContext = createContext<VoiceChatRuntime | null>(null);

export function VoiceChatRuntimeProvider({ children }: { children: ReactNode }) {
  const runtimeRef = useRef<VoiceChatRuntime | null>(null);

  if (!runtimeRef.current) {
    runtimeRef.current = createVoiceChatRuntime();
  }

  useEffect(() => {
    return () => {
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
    };
  }, []);

  return (
    <VoiceChatRuntimeContext.Provider value={runtimeRef.current}>
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
