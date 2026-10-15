// Royal Indian Wedding Audio Engine (Supports Song MP3 & Ambient Harmony)
class RoyalAudioEngine {
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

  public prime() {
    this.initAudio();
  }

  private initAudio() {
    if (typeof window === 'undefined') return;
    if (!this.audioElement) {
      this.audioElement = new Audio(this.songUrl);
      this.audioElement.loop = true;
      this.audioElement.volume = 0.95;
      this.audioElement.preload = 'auto';

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
    }).catch(() => {
      this.notify(false);
      if (onStateChange) onStateChange(false);
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
}

export const royalAudio = new RoyalAudioEngine();
