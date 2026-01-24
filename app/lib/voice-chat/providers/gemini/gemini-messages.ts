import type { 
  SessionConfig, 
  SetupMessage, 
  RealtimeInputMessage,
  ToolResponseMessage,
  ServerMessage 
} from '../../types/messages.types';
import type { FunctionResponse } from '../../types/tools.types';
import { pcmToBase64 } from '../../audio/audio-utils';

const AUDIO_INPUT_MIME_TYPE = 'audio/pcm;rate=16000';

/**
 * Costruisce il messaggio di setup iniziale
 */
export function buildSetupMessage(config: SessionConfig): SetupMessage {
  return { setup: config };
}

/**
 * Costruisce messaggio per invio audio
 */
export function buildAudioMessage(pcmData: ArrayBuffer): RealtimeInputMessage {
  return {
    realtimeInput: {
      audio: {
        data: pcmToBase64(pcmData),
        mimeType: AUDIO_INPUT_MIME_TYPE,
      },
    },
  };
}

/**
 * Costruisce messaggio per segnale inizio attività
 */
export function buildActivityStartMessage(): RealtimeInputMessage {
  return {
    realtimeInput: {
      activityStart: {},
    },
  };
}

/**
 * Costruisce messaggio per segnale fine attività
 */
export function buildActivityEndMessage(): RealtimeInputMessage {
  return {
    realtimeInput: {
      activityEnd: {},
    },
  };
}

/**
 * Costruisce messaggio per risposte tool
 */
export function buildToolResponseMessage(responses: FunctionResponse[]): ToolResponseMessage {
  return {
    toolResponse: {
      functionResponses: responses,
    },
  };
}

/**
 * Parsa un messaggio ricevuto dal server
 */
export function parseServerMessage(data: string): ServerMessage | null {
  try {
    return JSON.parse(data) as ServerMessage;
  } catch {
    return null;
  }
}
