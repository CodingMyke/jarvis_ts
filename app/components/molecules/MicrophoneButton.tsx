"use client";

import { Button, MicrophoneIcon, StopIcon } from "@/app/components/atoms";

interface MicrophoneButtonProps {
  isRecording: boolean;
  onClick: () => void;
}

export function MicrophoneButton({ isRecording, onClick }: MicrophoneButtonProps) {
  return (
    <Button
      type="button"
      variant={isRecording ? "recording" : "secondary"}
      onClick={onClick}
      aria-label={isRecording ? "Ferma chat vocale" : "Avvia chat vocale"}
    >
      {isRecording ? <StopIcon /> : <MicrophoneIcon />}
    </Button>
  );
}
