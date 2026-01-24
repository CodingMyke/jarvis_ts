/**
 * Converte PCM ArrayBuffer in stringa Base64
 */
export function pcmToBase64(pcm: ArrayBuffer): string {
  const bytes = new Uint8Array(pcm);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converte stringa Base64 in PCM ArrayBuffer
 */
export function base64ToPcm(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Converte Float32Array (Web Audio) in Int16Array (PCM 16-bit)
 */
export function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16;
}

/**
 * Converte Int16Array (PCM 16-bit) in Float32Array (Web Audio)
 * Usa divisione uniforme per evitare discontinuità a 0
 */
export function int16ToFloat32(int16: Int16Array): Float32Array {
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  return float32;
}

/**
 * Calcola il livello audio RMS (0-1) da campioni Float32
 */
export function calculateAudioLevel(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  
  return Math.sqrt(sum / samples.length);
}

/**
 * Downsample da una frequenza all'altra (es. 44100 -> 16000)
 */
export function downsample(
  buffer: Float32Array,
  fromSampleRate: number,
  toSampleRate: number
): Float32Array {
  if (fromSampleRate === toSampleRate) {
    return buffer;
  }
  
  const ratio = fromSampleRate / toSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const srcIndex = Math.floor(i * ratio);
    result[i] = buffer[srcIndex];
  }
  
  return result;
}
