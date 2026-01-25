/**
 * Manager per gestire i timer attivi.
 * Permette ai tool di avviare timer e ai componenti React di ascoltare gli aggiornamenti.
 */

export interface TimerState {
  id: string;
  durationSeconds: number;
  remainingSeconds: number;
  remainingMilliseconds: number;
  startTime: number;
  isActive: boolean;
  isExpired: boolean;
}

type TimerCallback = (state: TimerState | null) => void;

class TimerManager {
  private timers: Map<string, TimerState> = new Map();
  private animationFrames: Map<string, number> = new Map();
  private listeners: Set<TimerCallback> = new Set();
  private notificationInterval: NodeJS.Timeout | null = null;
  private audioContext: AudioContext | null = null;
  private isPlayingSound: boolean = false;
  private lastNotificationTime: Map<string, number> = new Map();

  /**
   * Avvia un nuovo timer.
   * @param durationSeconds Durata del timer in secondi
   * @returns ID del timer creato
   */
  startTimer(durationSeconds: number): string {
    // Ferma eventuali timer precedenti
    this.stopAllTimers();
    this.stopNotificationSound();

    const id = `timer-${Date.now()}`;
    const startTime = Date.now();

    const state: TimerState = {
      id,
      durationSeconds,
      remainingSeconds: durationSeconds,
      remainingMilliseconds: 0,
      startTime,
      isActive: true,
      isExpired: false,
    };

    this.timers.set(id, state);
    this.lastNotificationTime.set(id, Date.now());
    this.notifyListeners();

    // Usa requestAnimationFrame per aggiornamenti fluidi sincronizzati con il refresh rate
    const updateTimer = () => {
      const timer = this.timers.get(id);
      if (!timer) {
        return;
      }

      const elapsed = Date.now() - timer.startTime;
      const remainingTotal = Math.max(0, timer.durationSeconds * 1000 - elapsed);
      const remainingSeconds = Math.floor(remainingTotal / 1000);
      const remainingMilliseconds = Math.floor((remainingTotal % 1000) / 10); // Centesimi di secondo

      if (remainingTotal === 0) {
        // Timer completato
        timer.isActive = false;
        timer.isExpired = true;
        timer.remainingSeconds = 0;
        timer.remainingMilliseconds = 0;
        this.timers.set(id, timer);
        this.notifyListeners();
        this.playNotificationSound();
        this.animationFrames.delete(id);
        this.lastNotificationTime.delete(id);
      } else {
        timer.remainingSeconds = remainingSeconds;
        timer.remainingMilliseconds = remainingMilliseconds;
        this.timers.set(id, timer);
        
        // Notifica i listener solo ogni ~100ms per evitare troppi re-render
        const now = Date.now();
        const lastNotification = this.lastNotificationTime.get(id) || 0;
        if (now - lastNotification >= 100) {
          this.notifyListeners();
          this.lastNotificationTime.set(id, now);
        }
        
        // Continua l'animazione
        const frameId = requestAnimationFrame(updateTimer);
        this.animationFrames.set(id, frameId);
      }
    };

    const frameId = requestAnimationFrame(updateTimer);
    this.animationFrames.set(id, frameId);

    return id;
  }

  /**
   * Ferma un timer specifico e lo rimuove completamente.
   */
  stopTimer(id: string): boolean {
    const frameId = this.animationFrames.get(id);
    if (frameId !== undefined) {
      cancelAnimationFrame(frameId);
      this.animationFrames.delete(id);
    }

    this.lastNotificationTime.delete(id);

    const timer = this.timers.get(id);
    if (timer) {
      // Rimuovi completamente il timer
      this.timers.delete(id);
      this.notifyListeners();
      return true;
    }

    return false;
  }

  /**
   * Ferma tutti i timer attivi.
   */
  stopAllTimers(): void {
    for (const [id] of this.animationFrames) {
      this.stopTimer(id);
    }
  }

  /**
   * Ottiene lo stato del timer attivo (se presente).
   */
  getActiveTimer(): TimerState | null {
    for (const timer of this.timers.values()) {
      if (timer.isActive || timer.isExpired) {
        return timer;
      }
    }
    return null;
  }

  /**
   * Sottoscrive agli aggiornamenti del timer.
   */
  subscribe(callback: TimerCallback): () => void {
    this.listeners.add(callback);
    
    // Notifica immediatamente lo stato corrente
    callback(this.getActiveTimer());

    // Restituisce la funzione di unsubscribe
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notifica tutti i listener dello stato corrente.
   */
  private notifyListeners(): void {
    const activeTimer = this.getActiveTimer();
    for (const listener of this.listeners) {
      listener(activeTimer);
    }
  }

  /**
   * Riproduce il suono di notifica quando il timer finisce.
   * Il suono continua a suonare finché non viene fermato manualmente.
   */
  private playNotificationSound(): void {
    // Se sta già suonando, non fare nulla
    if (this.isPlayingSound) {
      return;
    }

    this.isPlayingSound = true;

    try {
      // Crea AudioContext se non esiste
      if (!this.audioContext) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = this.audioContext;

      // Funzione per creare un ciclo di suono
      const playSoundCycle = () => {
        if (!this.audioContext || !this.isPlayingSound) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Suono più piacevole (nota musicale)
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // La4
        oscillator.frequency.setValueAtTime(554.37, audioContext.currentTime + 0.1); // Do#5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.2); // Mi5

        // Volume massimo (1.0 = 100%)
        gainNode.gain.setValueAtTime(1.0, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.6);

        // Riproduci il suono più volte per essere sicuri che l'utente lo senta
        setTimeout(() => {
          if (!this.audioContext || !this.isPlayingSound) return;
          
          const oscillator2 = audioContext.createOscillator();
          const gainNode2 = audioContext.createGain();
          oscillator2.connect(gainNode2);
          gainNode2.connect(audioContext.destination);
          oscillator2.frequency.setValueAtTime(440, audioContext.currentTime);
          // Volume massimo anche per il secondo suono
          gainNode2.gain.setValueAtTime(1.0, audioContext.currentTime);
          gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
          oscillator2.start(audioContext.currentTime);
          oscillator2.stop(audioContext.currentTime + 0.6);
        }, 700);
      };

      // Riproduci il primo ciclo
      playSoundCycle();

      // Riproduci il suono ogni 2 secondi finché non viene fermato
      this.notificationInterval = setInterval(() => {
        if (this.isPlayingSound) {
          playSoundCycle();
        } else {
          if (this.notificationInterval) {
            clearInterval(this.notificationInterval);
            this.notificationInterval = null;
          }
        }
      }, 2000);
    } catch (error) {
      console.error("[TimerManager] Errore nella riproduzione del suono:", error);
      this.isPlayingSound = false;
    }
  }

  /**
   * Ferma il suono di notifica (se sta suonando).
   */
  stopNotificationSound(): void {
    this.isPlayingSound = false;

    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
      this.notificationInterval = null;
    }

    // Non chiudiamo l'audioContext perché potrebbe essere riutilizzato
  }
}

// Singleton instance
export const timerManager = new TimerManager();
