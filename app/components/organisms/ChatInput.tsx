"use client";

import { MicrophoneButton } from "@/app/components/molecules";

interface ChatInputProps {
  isRecording: boolean;
  onMicrophoneClick: () => void;
}

export function ChatInput({ isRecording, onMicrophoneClick }: ChatInputProps) {
  return (
    <div className="border-t border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-3xl justify-center">
        <MicrophoneButton isRecording={isRecording} onClick={onMicrophoneClick} />
      </div>
    </div>
  );
}
