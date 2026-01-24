"use client";

import { Button, TextInput } from "@/app/components/atoms";
import { MicrophoneButton } from "@/app/components/molecules";

interface ChatInputProps {
  isRecording: boolean;
  onMicrophoneClick: () => void;
}

export function ChatInput({ isRecording, onMicrophoneClick }: ChatInputProps) {
  return (
    <div className="border-t border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto max-w-3xl">
        <div className="flex gap-2">
          <TextInput type="text" placeholder="Scrivi un messaggio..." />
          <MicrophoneButton isRecording={isRecording} onClick={onMicrophoneClick} />
          <Button variant="primary" className="px-6 text-sm font-medium">
            Invia
          </Button>
        </div>
      </div>
    </div>
  );
}
