// Royal Indian Wedding Audio Engine (Supports Song MP3 & Ambient Harmony)
class RoyalAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private audioElement: HTMLAudioElement | null = null;
  private songUrl = '/music/aaj_sajeya.mp3';

  constructor() {
    // Lazy init
  }

  private initAudio() {
    if (typeof window === 'undefined') return;
    if (!this.audioElement) {
      this.audioElement = new Audio(this.songUrl);
      this.audioElement.loop = true;
      this.audioElement.volume = 0.65;
      this.audioElement.preload = 'auto';

      // Keep playing state in sync if ended or paused externally
      this.audioElement.addEventListener('play', () => {
        this.isPlaying = true;
      });
      this.audioElement.addEventListener('pause', () => {
        this.isPlaying = false;
      });
    }
  }

  public playSong(onStateChange?: (playing: boolean) => void): Promise<void> {
    this.initAudio();
    if (!this.audioElement) return Promise.resolve();

    return this.audioElement.play().then(() => {
      this.isPlaying = true;
      if (onStateChange) onStateChange(true);
    }).catch(err => {
      console.warn('Audio play was prevented by browser autoplay policy:', err);
    });
  }

  public pauseSong(onStateChange?: (playing: boolean) => void) {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.isPlaying = false;
    if (onStateChange) onStateChange(false);
  }

  public toggleMusic(onStateChange?: (playing: boolean) => void): boolean {
    this.initAudio();
    if (!this.audioElement) return false;

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
