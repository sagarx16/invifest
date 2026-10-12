// Royal Indian Wedding Audio Synthesizer (Shehnai/Tanpura Drone & Chimes)
class RoyalAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private oscillators: OscillatorNode[] = [];
  private gainNode: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private intervalId: number | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Soft Indian Tanpura Drone + Melodic Shehnai Ambient Harmony
  public toggleMusic(onStateChange?: (playing: boolean) => void): boolean {
    this.initContext();
    if (!this.ctx) return false;

    if (this.isPlaying) {
      this.stopMusic();
      if (onStateChange) onStateChange(false);
      return false;
    } else {
      this.startMusic();
      if (onStateChange) onStateChange(true);
      return true;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private startMusic() {
    if (!this.ctx) return;
    this.isPlaying = true;

    // Master Gain
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 2.5); // Smooth fade in
    this.gainNode.connect(this.ctx.destination);

    // Warm Low-pass Filter for royal acoustic resonance
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(750, this.ctx.currentTime);
    filter.connect(this.gainNode);

    // Root notes for Raag Yaman / Bhairavi: C#3 (138.59 Hz), G#3 (207.65 Hz), C#4 (277.18 Hz)
    const baseFreqs = [138.59, 207.65, 277.18, 415.30];

    // LFO for gentle slow tanpura vibrato / shimmer
    this.lfo = this.ctx.createOscillator();
    this.lfo.frequency.setValueAtTime(0.2, this.ctx.currentTime); // slow pulse
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(1.5, this.ctx.currentTime);
    this.lfo.connect(lfoGain);
    this.lfo.start();

    this.oscillators = baseFreqs.map((freq, i) => {
      const osc = this.ctx!.createOscillator();
      // Mix sawtooth and sine for rich acoustic string/shehnai timbre
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);
      lfoGain.connect(osc.frequency);

      const oscGain = this.ctx!.createGain();
      oscGain.gain.setValueAtTime(0.25 / (i + 1), this.ctx!.currentTime);
      osc.connect(oscGain);
      oscGain.connect(filter);
      osc.start();
      return osc;
    });

    // Random melodic sitar / flute note strikes every 3-5 seconds
    const melodyNotes = [277.18, 311.13, 349.23, 415.30, 466.16, 554.37];
    this.intervalId = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx || !this.gainNode) return;
      const noteFreq = melodyNotes[Math.floor(Math.random() * melodyNotes.length)];
      this.playPluckNote(noteFreq);
    }, 3800);
  }

  private playPluckNote(freq: number) {
    if (!this.ctx || !this.gainNode) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    const now = this.ctx.currentTime;
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

    osc.connect(g);
    g.connect(this.gainNode);
    osc.start(now);
    osc.stop(now + 2.3);
  }

  private stopMusic() {
    if (!this.ctx) return;
    if (this.gainNode) {
      this.gainNode.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 1.0);
    }
    setTimeout(() => {
      this.oscillators.forEach(o => {
        try { o.stop(); o.disconnect(); } catch (e) {}
      });
      this.oscillators = [];
      if (this.lfo) {
        try { this.lfo.stop(); this.lfo.disconnect(); } catch (e) {}
        this.lfo = null;
      }
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      this.isPlaying = false;
    }, 1100);
  }

  // Royal Temple Bell / Conch sound when palace gates swing open
  public playDoorOpenSound() {
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const frequencies = [261.63, 523.25, 784.88, 1046.50]; // Rich bell chime harmonics
    frequencies.forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);

      g.gain.setValueAtTime(0.1 / (idx + 1), now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);

      osc.connect(g);
      g.connect(this.ctx!.destination);
      osc.start(now);
      osc.stop(now + 3.1);
    });
  }

  // Subtle Golden Crystal Button Click
  public playClickSound() {
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);

    g.gain.setValueAtTime(0.04, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }
}

export const royalAudio = new RoyalAudioEngine();
