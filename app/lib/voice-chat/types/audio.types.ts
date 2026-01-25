export interface AudioFormat {
  sampleRate: number;
  channels: number;
  bitDepth: number;
}

export interface AudioChunk {
  data: ArrayBuffer;
  timestamp: number;
}

export interface AudioInputManagerOptions {
  format: AudioFormat;
  chunkIntervalMs: number;
  onChunk: (chunk: AudioChunk) => void;
  onError: (error: Error) => void;
  onLevelChange?: (level: number) => void;
}

export interface AudioOutputManagerOptions {
  format: AudioFormat;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onLevelChange?: (level: number) => void;
  onError: (error: Error) => void;
}
