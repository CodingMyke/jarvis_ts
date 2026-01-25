import type { AudioOutputManagerOptions } from '../types/audio.types';
import { int16ToFloat32 } from './audio-utils';

// Dimensione minima del buffer accumulato prima di riprodurre (in campioni)
// A 24kHz: 4800 campioni = 200ms di audio
const MIN_BUFFER_SAMPLES = 4800;

// Intervallo per aggiornamento livello audio (ms)
const LEVEL_UPDATE_INTERVAL_MS = 50;

/**
 * Gestisce la riproduzione audio streaming con buffering.
 * Riceve chunk PCM 16-bit 24kHz e li riproduce in sequenza senza gap.
 * Accumula chunk in buffer più grandi per ridurre le transizioni.
 */
export class AudioOutputManager {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private scheduledSources: AudioBufferSourceNode[] = [];
  private nextPlayTime = 0;
  private isPlaying = false;
  private levelIntervalId: ReturnType<typeof setInterval> | null = null;
  
  // Accumulator per raggruppare chunk piccoli
  private accumulator: Float32Array[] = [];
  private accumulatorLength = 0;
  
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
    
    // AnalyserNode per rilevare il livello audio
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.3;
    
    // GainNode per controllo volume e fade globali
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.audioContext.destination);
    
    // Avvia il monitoraggio del livello
    this.startLevelMonitoring();
  }
  
  /**
   * Avvia il monitoraggio del livello audio dell'output
   */
  private startLevelMonitoring(): void {
    if (!this.options.onLevelChange || this.levelIntervalId) return;
    
    const dataArray = new Uint8Array(this.analyserNode!.frequencyBinCount);
    
    this.levelIntervalId = setInterval(() => {
      if (!this.analyserNode || !this.isPlaying) {
        this.options.onLevelChange?.(0);
        return;
      }
      
      this.analyserNode.getByteFrequencyData(dataArray);
      
      // Calcola RMS del segnale
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      
      // Normalizza a 0-1 (255 è il max per Uint8Array)
      const level = Math.min(1, rms / 128);
      
      this.options.onLevelChange?.(level);
    }, LEVEL_UPDATE_INTERVAL_MS);
  }
  
  /**
   * Ferma il monitoraggio del livello audio
   */
  private stopLevelMonitoring(): void {
    if (this.levelIntervalId) {
      clearInterval(this.levelIntervalId);
      this.levelIntervalId = null;
    }
    this.options.onLevelChange?.(0);
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
    
    if (!this.audioContext || !this.gainNode) return;

    try {
      // Converti PCM 16-bit in Float32
      const int16 = new Int16Array(pcmData);
      const float32 = int16ToFloat32(int16);
      
      // Accumula chunk
      this.accumulator.push(float32);
      this.accumulatorLength += float32.length;
      
      // Quando abbiamo abbastanza campioni, crea un buffer unificato e riproduci
      if (this.accumulatorLength >= MIN_BUFFER_SAMPLES) {
        this.flushAccumulator();
      }
    } catch (error) {
      this.options.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Forza la riproduzione dei chunk accumulati (chiamato a fine stream)
   */
  flush(): void {
    if (this.accumulatorLength > 0) {
      this.flushAccumulator();
    }
  }

  private flushAccumulator(): void {
    if (!this.audioContext || !this.gainNode || this.accumulator.length === 0) return;
    
    // Unisci tutti i chunk accumulati in un unico buffer
    const mergedBuffer = new Float32Array(this.accumulatorLength);
    let offset = 0;
    for (const chunk of this.accumulator) {
      mergedBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Reset accumulator
    this.accumulator = [];
    this.accumulatorLength = 0;
    
    // Applica fade in solo sul primissimo buffer
    if (!this.isPlaying && this.scheduledSources.length === 0) {
      this.applyFadeIn(mergedBuffer);
    }
    
    // Crea AudioBuffer
    const audioBuffer = this.audioContext.createBuffer(
      1,
      mergedBuffer.length,
      this.options.format.sampleRate
    );
    audioBuffer.getChannelData(0).set(mergedBuffer);
    
    // Prima volta: imposta il tempo iniziale
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.nextPlayTime = this.audioContext.currentTime + 0.05; // 50ms latenza iniziale
      this.options.onPlaybackStart?.();
    }
    
    // Se siamo rimasti indietro, resettiamo il tempo
    if (this.nextPlayTime < this.audioContext.currentTime) {
      this.nextPlayTime = this.audioContext.currentTime + 0.01;
    }
    
    // Crea e schedula source
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);
    source.start(this.nextPlayTime);
    
    this.nextPlayTime += audioBuffer.duration;
    
    // Tieni traccia per cleanup
    this.scheduledSources.push(source);
    source.onended = () => {
      const idx = this.scheduledSources.indexOf(source);
      if (idx !== -1) this.scheduledSources.splice(idx, 1);
      
      // Se non ci sono più source schedulati e nessun chunk pendente
      if (this.scheduledSources.length === 0 && this.accumulatorLength === 0) {
        this.isPlaying = false;
        this.options.onPlaybackEnd?.();
      }
    };
  }

  /**
   * Svuota la coda e interrompe la riproduzione (per interruzioni)
   */
  clear(): void {
    this.accumulator = [];
    this.accumulatorLength = 0;
    
    // Fade out velocissimo prima di fermare (20ms)
    if (this.gainNode && this.audioContext) {
      const now = this.audioContext.currentTime;
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
      this.gainNode.gain.linearRampToValueAtTime(0, now + 0.02);
      
      // Ferma tutti i source dopo il fade
      setTimeout(() => {
        for (const source of this.scheduledSources) {
          try {
            source.stop();
          } catch {
            // Ignora errori se già fermato
          }
        }
        this.scheduledSources = [];
        
        // Ripristina gain
        if (this.gainNode) {
          this.gainNode.gain.setValueAtTime(1, this.audioContext!.currentTime);
        }
      }, 30);
    }
    
    this.isPlaying = false;
    this.nextPlayTime = 0;
  }

  /**
   * Rilascia risorse
   */
  dispose(): void {
    this.clear();
    this.stopLevelMonitoring();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.gainNode = null;
      this.analyserNode = null;
    }
  }

  get playing(): boolean {
    return this.isPlaying;
  }

  get queueLength(): number {
    return this.scheduledSources.length;
  }

  /**
   * Applica fade in all'inizio del primo buffer.
   */
  private applyFadeIn(samples: Float32Array): void {
    // Fade in di ~5ms a 24kHz = 120 campioni
    const fadeLen = Math.min(120, samples.length);
    for (let i = 0; i < fadeLen; i++) {
      samples[i] *= i / fadeLen;
    }
  }
}
