import type { AudioFormat } from '../types/audio.types';

export const AUDIO_INPUT_SAMPLE_RATE = 16000;
export const AUDIO_OUTPUT_SAMPLE_RATE = 24000;
export const AUDIO_CHUNK_INTERVAL_MS = 100;

export const DEFAULT_AUDIO_FORMAT: AudioFormat = {
  sampleRate: AUDIO_INPUT_SAMPLE_RATE,
  channels: 1,
  bitDepth: 16,
};

export const GEMINI_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
export const GEMINI_API_VERSION = 'v1alpha';
