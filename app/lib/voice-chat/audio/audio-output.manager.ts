import type { AudioOutputManagerOptions } from '../types/audio.types';
import { int16ToFloat32 } from './audio-utils';

interface QueuedAudio {
  buffer: AudioBuffer;
  timestamp: number;
}

/**
 * Gestisce la riproduzione audio streaming con buffering.
 * Riceve chunk PCM 16-bit 24kHz e li riproduce in sequenza senza gap.
 */
export class AudioOutputManager {
  private audioContext: AudioContext | null = null;
  private queue: QueuedAudio[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private nextPlayTime = 0;
  
  private options: AudioOutputManagerOptions;

  constructor(options: AudioOutputManagerOptions) {
    this.options = options;
  }

  /**
   * Inizializza l'AudioContext (deve essere chiamato dopo un'interazione utente)
   */
  initialize(): void {
    if (this.audioContext) return;
    
    if (typeof window === 'undefined') {
      throw new Error('AudioOutputManager can only be used in browser');
    }
    
    this.audioContext = new AudioContext({
      sampleRate: this.options.format.sampleRate,
    });
  }

  /**
   * Accoda un chunk audio per la riproduzione
   */
  playChunk(pcmData: ArrayBuffer): void {
    this.enqueue(pcmData);
  }

  /**
   * Accoda un chunk audio per la riproduzione
   */
  enqueue(pcmData: ArrayBuffer): void {
    if (!this.audioContext) {
      this.initialize();
    }
    
    if (!this.audioContext) return;

    try {
      // Converti PCM 16-bit in Float32
      const int16 = new Int16Array(pcmData);
      const float32 = int16ToFloat32(int16);
      
      // Crea AudioBuffer
      const audioBuffer = this.audioContext.createBuffer(
        1, // mono
        float32.length,
        this.options.format.sampleRate
      );
      
      audioBuffer.getChannelData(0).set(float32);
      
      this.queue.push({
        buffer: audioBuffer,
        timestamp: Date.now(),
      });
      
      // Avvia riproduzione se non già attiva
      if (!this.isPlaying) {
        this.playNext();
      }
    } catch (error) {
      this.options.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Svuota la coda e interrompe la riproduzione (per interruzioni)
   */
  clear(): void {
    this.queue = [];
    
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Ignora errori se già fermato
      }
      this.currentSource = null;
    }
    
    this.isPlaying = false;
    this.nextPlayTime = 0;
  }

  /**
   * Rilascia risorse
   */
  dispose(): void {
    this.clear();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  get playing(): boolean {
    return this.isPlaying;
  }

  get queueLength(): number {
    return this.queue.length;
  }

  private playNext(): void {
    if (!this.audioContext || this.queue.length === 0) {
      this.isPlaying = false;
      this.options.onPlaybackEnd?.();
      return;
    }
    
    const { buffer } = this.queue.shift()!;
    
    // Notifica inizio riproduzione al primo chunk
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.nextPlayTime = this.audioContext.currentTime;
      this.options.onPlaybackStart?.();
    }
    
    // Crea source node
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    
    // Schedula riproduzione
    source.start(this.nextPlayTime);
    this.nextPlayTime += buffer.duration;
    
    this.currentSource = source;
    
    // Quando termina, riproduci il prossimo
    source.onended = () => {
      if (source === this.currentSource) {
        this.currentSource = null;
        this.playNext();
      }
    };
  }
}
