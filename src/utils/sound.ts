// Procedural Audio Engine for Racing Game using Web Audio API

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private nitroOsc: OscillatorNode | null = null;
  private nitroGain: GainNode | null = null;
  private nitroNoise: AudioNode | null = null;
  private isEngineRunning: boolean = false;
  private synthInterval: number | null = null;

  constructor() {
    // Audio context will initialize on first user gesture
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      if (this.engineGain) this.engineGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
      if (this.nitroGain) this.nitroGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
  }

  public getMuted() {
    return this.isMuted;
  }

  public startEngine() {
    if (this.isEngineRunning || this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      // Main Engine oscillator
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // Base idle ~55Hz

      // Engine lowpass filter for growl
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
      this.engineFilter.Q.setValueAtTime(3, this.ctx.currentTime);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start();
      this.isEngineRunning = true;
    } catch {
      // Audio context might be waiting for user interaction
    }
  }

  public updateEnginePitch(speedPercent: number, isBraking: boolean, isNitro: boolean) {
    if (!this.isEngineRunning || !this.ctx || this.isMuted || !this.engineOsc || !this.engineFilter) return;

    const t = this.ctx.currentTime;
    let baseFreq = 50 + speedPercent * 140; // 50Hz to 190Hz
    if (isNitro) baseFreq *= 1.45;
    if (isBraking) baseFreq *= 0.75;

    // Add slight vibration/jitter
    const jitter = (Math.random() - 0.5) * 4;
    this.engineOsc.frequency.setTargetAtTime(Math.max(35, baseFreq + jitter), t, 0.05);

    const filterCutoff = 280 + speedPercent * 600 + (isNitro ? 400 : 0);
    this.engineFilter.frequency.setTargetAtTime(filterCutoff, t, 0.05);

    if (this.engineGain) {
      const targetVol = this.isMuted ? 0 : 0.06 + speedPercent * 0.08 + (isNitro ? 0.04 : 0);
      this.engineGain.gain.setTargetAtTime(targetVol, t, 0.05);
    }
  }

  public stopEngine() {
    if (!this.isEngineRunning) return;
    try {
      if (this.engineOsc) {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      }
      this.isEngineRunning = false;
    } catch {
      // Cleanup safely
    }
  }

  public playNitroBoost() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.3);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.Q.setValueAtTime(1.5, t);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  public playTireScreech() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, t);
    filter.Q.setValueAtTime(6.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  public playCrash() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    noise.connect(gain);
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  public playCountdownBeep(isFinal: boolean) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isFinal ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isFinal ? 880 : 440, t); // A5 or A4

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isFinal ? 0.6 : 0.25));

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + (isFinal ? 0.6 : 0.25));
  }

  public playLapChime() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    freqs.forEach((freq, index) => {
      if (!this.ctx) return;
      const noteTime = t + index * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.18, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.35);
    });
  }

  public playBonus() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.15);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  public playClick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }
}

export const sound = new SoundEngine();
