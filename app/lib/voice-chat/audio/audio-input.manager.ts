import type { AudioInputManagerOptions, AudioChunk } from '../types/audio.types';
import { float32ToInt16, downsample, calculateAudioLevel } from './audio-utils';
import { AUDIO_INPUT_SAMPLE_RATE } from '../config';

/**
 * Gestisce la cattura audio dal microfono usando Web Audio API.
 * Converte l'audio in formato PCM 16-bit 16kHz per l'invio al server.
 */
export class AudioInputManager {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  
  private isCapturing = false;
  private isMuted = false;
  
  private options: AudioInputManagerOptions;
  private audioBuffer: Float32Array[] = [];
  private chunkInterval: ReturnType<typeof setInterval> | null = null;

  constructor(options: AudioInputManagerOptions) {
    this.options = options;
  }

  async start(): Promise<void> {
    if (this.isCapturing) return;
    
    if (typeof window === 'undefined') {
      throw new Error('AudioInputManager can only be used in browser');
    }

    try {
      // Richiedi accesso al microfono
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: { ideal: AUDIO_INPUT_SAMPLE_RATE },
        },
      });

      // Crea AudioContext
      this.audioContext = new AudioContext({
        sampleRate: this.options.format.sampleRate,
      });

      // Connetti il microfono all'AudioContext
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Usa ScriptProcessor per compatibilità (AudioWorklet non supportato ovunque)
      const bufferSize = 4096;
      this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      
      this.processorNode.onaudioprocess = (event) => {
        if (this.isMuted) return;
        
        const inputData = event.inputBuffer.getChannelData(0);
        const samples = new Float32Array(inputData);
        
        // Calcola livello audio
        if (this.options.onLevelChange) {
          const level = calculateAudioLevel(samples);
          this.options.onLevelChange(level);
        }
        
        // Accumula campioni
        this.audioBuffer.push(samples);
      };
      
      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);
      
      // Invia chunk a intervalli regolari
      this.chunkInterval = setInterval(() => {
        this.flushBuffer();
      }, this.options.chunkIntervalMs);
      
      this.isCapturing = true;
    } catch (error) {
      this.cleanup();
      this.options.onError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  stop(): void {
    this.cleanup();
    this.isCapturing = false;
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  get capturing(): boolean {
    return this.isCapturing;
  }

  get muted(): boolean {
    return this.isMuted;
  }

  dispose(): void {
    this.stop();
  }

  private flushBuffer(): void {
    if (this.audioBuffer.length === 0) return;
    
    // Concatena tutti i buffer accumulati
    const totalLength = this.audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;
    
    for (const buf of this.audioBuffer) {
      combined.set(buf, offset);
      offset += buf.length;
    }
    
    this.audioBuffer = [];
    
    // Downsample se necessario (il browser potrebbe usare sample rate diverso)
    const targetRate = this.options.format.sampleRate;
    const sourceRate = this.audioContext?.sampleRate || targetRate;
    const resampled = downsample(combined, sourceRate, targetRate);
    
    // Converti in PCM 16-bit
    const pcm = float32ToInt16(resampled);
    
    // Crea chunk
    const chunk: AudioChunk = {
      data: pcm.buffer as ArrayBuffer,
      timestamp: Date.now(),
    };
    
    this.options.onChunk(chunk);
  }

  private cleanup(): void {
    if (this.chunkInterval) {
      clearInterval(this.chunkInterval);
      this.chunkInterval = null;
    }
    
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    this.audioBuffer = [];
  }
}
