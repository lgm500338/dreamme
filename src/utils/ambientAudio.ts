import { SoundTheme } from '../types/dream';

/**
 * Zero-API procedural Web Audio ambient soundscape generator.
 * Synthesizes ocean waves, warm cafe tones, gentle park breeze, and serene home pads
 * directly in the browser without external audio servers.
 */
class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: AudioNode[] = [];
  private activeIntervals: number[] = [];
  private currentTheme: SoundTheme | null = null;
  private enabled = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.22;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext, seconds = 3): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, sampleRate * seconds, sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    // Pink-ish soft noise
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2 + white * 0.015) * 0.6;
    }
    return buffer;
  }

  public start(theme: SoundTheme) {
    this.stopNodes();
    this.enabled = true;
    this.currentTheme = theme;

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const noiseBuffer = this.createNoiseBuffer(ctx, 4);

    if (theme === 'ocean') {
      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 380;

      const waveGain = ctx.createGain();
      waveGain.gain.value = 0.4;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.12; // ~8 second wave cycle

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 180;

      const ampLfoGain = ctx.createGain();
      ampLfoGain.gain.value = 0.16;

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.connect(ampLfoGain);
      ampLfoGain.connect(waveGain.gain);

      source.connect(filter);
      filter.connect(waveGain);
      waveGain.connect(this.masterGain);

      source.start();
      lfo.start();
      this.activeNodes.push(source, filter, waveGain, lfo, lfoGain, ampLfoGain);
    } else if (theme === 'park') {
      // Soft breeze
      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 520;
      filter.Q.value = 1.4;

      const breezeGain = ctx.createGain();
      breezeGain.gain.value = 0.2;

      source.connect(filter);
      filter.connect(breezeGain);
      breezeGain.connect(this.masterGain);
      source.start();
      this.activeNodes.push(source, filter, breezeGain);

      // Gentle occasional melodic bird chirp
      const interval = window.setInterval(() => {
        if (!this.enabled || !this.ctx || !this.masterGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        const baseFreq = 2100 + Math.random() * 550;
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.28, now + 0.09);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.96, now + 0.19);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.035, now + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.25);
      }, 4200);
      this.activeIntervals.push(interval);
    } else if (theme === 'cafe') {
      // Warm muffled ambiance + soft pentatonic electric piano chime
      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 260;
      const gain = ctx.createGain();
      gain.gain.value = 0.16;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      source.start();
      this.activeNodes.push(source, filter, gain);

      const notes = [261.63, 329.63, 392.0, 493.88, 587.33]; // Cmaj9 dreamy voicings
      let idx = 0;
      const playNote = () => {
        if (!this.enabled || !this.ctx || !this.masterGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(notes[idx % notes.length], now);
        idx += 1;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.05, now + 0.12);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 2.9);
      };
      playNote();
      const interval = window.setInterval(playNote, 3200);
      this.activeIntervals.push(interval);
    } else {
      // Serene home / lounge warm harmonic pad
      const freqs = [196.0, 293.66, 392.0]; // G3, D4, G4 warm fifths
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;

        const g = ctx.createGain();
        g.gain.value = i === 0 ? 0.045 : 0.025;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 600;

        osc.connect(filter);
        filter.connect(g);
        g.connect(this.masterGain!);
        osc.start();
        this.activeNodes.push(osc, filter, g);
      });
    }
  }

  private stopNodes() {
    this.activeIntervals.forEach((id) => window.clearInterval(id));
    this.activeIntervals = [];
    this.activeNodes.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch {
        // Ignore already stopped nodes
      }
    });
    this.activeNodes = [];
  }

  public stop() {
    this.enabled = false;
    this.currentTheme = null;
    this.stopNodes();
  }

  public isPlaying(): boolean {
    return this.enabled;
  }

  public getTheme(): SoundTheme | null {
    return this.currentTheme;
  }
}

export const ambientAudio = new AmbientAudioEngine();
