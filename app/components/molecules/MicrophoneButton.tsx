"use client";

import { MicrophoneIcon, StopIcon } from "@/app/components/atoms";

interface MicrophoneButtonProps {
  isRecording: boolean;
  onClick: () => void;
}

export function MicrophoneButton({ isRecording, onClick }: MicrophoneButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isRecording ? "Ferma chat vocale" : "Avvia chat vocale"}
      className={`
        flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border
        transition-all duration-300 focus:outline-none
        ${
          isRecording
            ? "border-accent bg-accent/20 text-accent shadow-[0_0_30px_rgba(0,240,255,0.4)]"
            : "border-white/20 bg-white/5 text-muted hover:border-accent/50 hover:text-accent hover:shadow-[0_0_20px_rgba(0,240,255,0.2)]"
        }
      `}
    >
      {isRecording ? <StopIcon /> : <MicrophoneIcon />}
    </button>
  );
}
