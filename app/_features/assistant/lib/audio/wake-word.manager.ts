/**
 * Manager per il rilevamento della wake word usando la Speech Recognition API del browser.
 * Rimane in ascolto continuo e chiama il callback quando rileva la keyword.
 */
export interface WakeWordManagerOptions {
  keyword: string;
  language: string;
  onWakeWord: (transcript: string) => void;
  onError?: (error: Error) => void;
}

export class WakeWordManager {
  private recognition: SpeechRecognition | null = null;
  private options: WakeWordManagerOptions;
  private isListening = false;
  private shouldRestart = false;
  private pendingWakeWord = false; // True quando abbiamo rilevato la keyword ma aspettiamo la frase completa

  constructor(options: WakeWordManagerOptions) {
    this.options = options;
  }

  start(): void {
    if (this.isListening) return;

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      this.options.onError?.(
        new Error("Speech Recognition API not supported in this browser")
      );
      return;
    }

    this.recognition = new SpeechRecognitionAPI();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.options.language;

    this.recognition.onresult = (event) => {
      this.handleResult(event);
    };

    this.recognition.onerror = (event) => {
      // Ignora errori "no-speech" - sono normali durante l'ascolto continuo
      if (event.error === "no-speech") return;

      this.options.onError?.(new Error(`Speech recognition error: ${event.error}`));
    };

    this.recognition.onend = () => {
      // Riavvia automaticamente se dovrebbe essere in ascolto
      if (this.shouldRestart && this.isListening) {
        this.recognition?.start();
      }
    };

    this.isListening = true;
    this.shouldRestart = true;
    this.recognition.start();
  }

  stop(): void {
    this.isListening = false;
    this.shouldRestart = false;
    this.recognition?.stop();
    this.recognition = null;
  }

  /**
   * Mette in pausa l'ascolto senza distruggere il manager.
   * Utile quando si passa a Gemini.
   */
  pause(): void {
    this.shouldRestart = false;
    this.recognition?.stop();
  }

  /**
   * Riprende l'ascolto dopo una pausa.
   */
  resume(): void {
    if (!this.isListening) return;
    
    this.shouldRestart = true;
    this.recognition?.start();
  }

  dispose(): void {
    this.stop();
  }

  private handleResult(event: SpeechRecognitionEvent): void {
    const keyword = this.options.keyword.toLowerCase();

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript.toLowerCase();

      // Controlla se contiene la keyword
      if (transcript.includes(keyword)) {
        this.pendingWakeWord = true;
        
        // Aspetta che la frase sia completa (isFinal) prima di inviare
        if (result.isFinal) {
          const fullTranscript = result[0].transcript;
          
          // Ferma temporaneamente per evitare duplicati
          this.pause();
          this.pendingWakeWord = false;
          
          this.options.onWakeWord(fullTranscript);
          return;
        }
      }
    }
  }
}
