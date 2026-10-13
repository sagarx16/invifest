// Royal Indian Wedding Audio Engine (Supports Song MP3 & Ambient Harmony)
class RoyalAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private audioElement: HTMLAudioElement | null = null;
  private songUrl = '/music/aaj_sajeya.mp3';

  private isManuallyPaused = false;
  private listeners: Set<(playing: boolean) => void> = new Set();

  constructor() {
    // Lazy init
  }

  public subscribe(fn: (playing: boolean) => void): () => void {
    this.listeners.add(fn);
    fn(this.isPlaying);
    return () => this.listeners.delete(fn);
  }

  private notify(playing: boolean) {
    this.isPlaying = playing;
    this.listeners.forEach((fn) => {
      try {
        fn(playing);
      } catch (e) {}
    });
  }

  private initAudio() {
    if (typeof window === 'undefined') return;
    if (!this.audioElement) {
      this.audioElement = new Audio(this.songUrl);
      this.audioElement.loop = true;
      this.audioElement.volume = 0.85;
      this.audioElement.preload = 'none';

      // Keep playing state in sync
      this.audioElement.addEventListener('play', () => {
        this.notify(true);
      });
      this.audioElement.addEventListener('pause', () => {
        this.notify(false);
      });
      this.audioElement.addEventListener('ended', () => {
        // Ensure seamless looping
        this.audioElement?.play().catch(() => {});
      });
    }
  }

  public setManuallyPaused(paused: boolean) {
    this.isManuallyPaused = paused;
  }

  public getIsManuallyPaused(): boolean {
    return this.isManuallyPaused;
  }

  public playSong(onStateChange?: (playing: boolean) => void): Promise<void> {
    this.initAudio();
    if (!this.audioElement) return Promise.resolve();
    if (this.isManuallyPaused) {
      this.notify(false);
      if (onStateChange) onStateChange(false);
      return Promise.resolve();
    }

    return this.audioElement.play().then(() => {
      this.notify(true);
      if (onStateChange) onStateChange(true);
    }).catch(err => {
      this.notify(false);
      if (onStateChange) onStateChange(false);
      console.warn('Audio play was prevented by browser autoplay policy:', err);
      // Automatically retry on the very first user interaction ONLY if user has not manually muted
      const resumeOnGesture = () => {
        if (!this.isManuallyPaused && this.audioElement && this.audioElement.paused) {
          this.audioElement.play().then(() => {
            this.notify(true);
            if (onStateChange) onStateChange(true);
          }).catch(() => {});
        }
        ['click', 'touchstart', 'pointerdown', 'keydown'].forEach(evt => {
          window.removeEventListener(evt, resumeOnGesture);
        });
      };
      ['click', 'touchstart', 'pointerdown', 'keydown'].forEach(evt => {
        window.addEventListener(evt, resumeOnGesture, { once: true, passive: true });
      });
    });
  }

  public pauseSong(onStateChange?: (playing: boolean) => void) {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.notify(false);
    if (onStateChange) onStateChange(false);
  }

  public toggleMusic(onStateChange?: (playing: boolean) => void): boolean {
    this.initAudio();
    if (!this.audioElement) return false;

    // Keep sound on - if paused or playing, ensure it's active
    if (this.audioElement.paused) {
      this.playSong(onStateChange);
      return true;
    } else {
      this.pauseSong(onStateChange);
      return false;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  // Royal Temple Chime when envelope opens
  public playDoorOpenSound() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const frequencies = [261.63, 523.25, 784.88, 1046.50];
      frequencies.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);

        g.gain.setValueAtTime(0.08 / (idx + 1), now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 2.6);
      });
    } catch (e) {}
  }
}

export const royalAudio = new RoyalAudioEngine();
