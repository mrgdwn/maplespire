const PENTATONIC_FLUTE_NOTES: readonly number[] = [
  523.25, 587.33, 659.25, 783.99, 880,
];

class SoundSynth {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private noiseBuffer: AudioBuffer | null = null;
  private lastPlayedAt: Map<string, number> = new Map();

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    }
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext;
    if (!AudioCtx) return null;
    this.ctx = new AudioCtx();
    return this.ctx;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const frameCount = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private jitter(freq: number, spread: number = 0.1): number {
    const delta = (Math.random() * 2 - 1) * spread;
    return Math.max(20, freq * (1 + delta));
  }

  private canPlay(key: string, minGapMs: number = 45): boolean {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const prev = this.lastPlayedAt.get(key);
    if (prev !== undefined && now - prev < minGapMs) {
      return false;
    }
    this.lastPlayedAt.set(key, now);
    return true;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    gainLevel: number,
    delay: number = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freqStart), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);

    gain.gain.setValueAtTime(Math.max(0.001, gainLevel), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  private playNoiseBurst(
    duration: number,
    filterFreq: number,
    q: number,
    gainLevel: number,
    filterType: BiquadFilterType = 'bandpass',
    delay: number = 0,
    filterFreqEnd?: number
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const buffer = this.getNoiseBuffer(ctx);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    if (duration >= buffer.duration) {
      source.loop = true;
    }

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.setValueAtTime(Math.max(0.1, q), now);
    filter.frequency.setValueAtTime(Math.max(20, filterFreq), now);
    if (filterFreqEnd !== undefined) {
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(20, filterFreqEnd),
        now + duration
      );
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.001, gainLevel), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    const maxOffset = Math.max(0, buffer.duration - duration - 0.01);
    const offset = maxOffset > 0 ? Math.random() * maxOffset : 0;
    source.start(now, offset);
    source.stop(now + duration);
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  public playSwing(): void {
    if (!this.canPlay('swing', 45)) return;
    this.playTone(this.jitter(260, 0.1), this.jitter(90, 0.1), 0.1, 'sawtooth', 0.075);
    this.playNoiseBurst(0.08, this.jitter(1900, 0.12), 1.6, 0.04, 'bandpass', 0, this.jitter(900, 0.1));
  }

  public playSpell(): void {
    if (!this.canPlay('spell', 45)) return;
    this.playTone(this.jitter(480, 0.09), this.jitter(880, 0.09), 0.14, 'triangle', 0.07);
  }

  public playArrow(): void {
    if (!this.canPlay('arrow', 45)) return;
    this.playTone(this.jitter(620, 0.1), this.jitter(220, 0.1), 0.08, 'square', 0.05);
  }

  public playCrit(): void {
    if (!this.canPlay('crit', 50)) return;
    this.playTone(this.jitter(540, 0.09), this.jitter(1080, 0.09), 0.09, 'square', 0.085);
    this.playTone(this.jitter(820, 0.09), this.jitter(1360, 0.09), 0.11, 'triangle', 0.08, 0.035);
    this.playTone(this.jitter(1640, 0.08), this.jitter(2180, 0.08), 0.1, 'sine', 0.045, 0.04);
    this.playNoiseBurst(0.065, this.jitter(3600, 0.1), 2.2, 0.06, 'highpass');
  }

  public playHit(): void {
    if (!this.canPlay('hit', 45)) return;
    this.playTone(this.jitter(155, 0.1), this.jitter(62, 0.1), 0.09, 'sawtooth', 0.075);
    this.playTone(this.jitter(95, 0.08), 45, 0.07, 'sine', 0.055);
    this.playNoiseBurst(0.055, this.jitter(950, 0.12), 1.2, 0.055, 'lowpass');
  }

  public playDash(): void {
    if (!this.canPlay('dash', 55)) return;
    this.playNoiseBurst(
      0.12,
      this.jitter(1400, 0.1),
      1.8,
      0.07,
      'bandpass',
      0,
      this.jitter(2800, 0.1)
    );
    this.playTone(this.jitter(340, 0.1), this.jitter(620, 0.1), 0.09, 'sine', 0.04);
  }

  public playCoin(): void {
    if (!this.canPlay('coin', 45)) return;
    this.playTone(this.jitter(980, 0.08), this.jitter(1420, 0.08), 0.07, 'square', 0.05);
    this.playTone(this.jitter(1320, 0.08), this.jitter(1760, 0.08), 0.09, 'square', 0.05, 0.05);
  }

  public playDraft(): void {
    this.playTone(440, 554, 0.09, 'triangle', 0.07);
    this.playTone(659, 880, 0.14, 'triangle', 0.07, 0.06);
  }

  public playRouletteTick(): void {
    if (!this.canPlay('rouletteTick', 30)) return;
    this.playTone(this.jitter(720, 0.08), this.jitter(480, 0.08), 0.04, 'square', 0.04);
  }

  public playBossRoar(): void {
    if (!this.canPlay('bossRoar', 120)) return;
    this.playTone(this.jitter(140, 0.08), this.jitter(46, 0.08), 0.38, 'sawtooth', 0.115);
    this.playTone(this.jitter(105, 0.08), this.jitter(38, 0.08), 0.4, 'square', 0.075, 0.04);
    this.playNoiseBurst(
      0.36,
      this.jitter(420, 0.1),
      1.5,
      0.09,
      'lowpass',
      0.02,
      180
    );
  }

  public playVictory(): void {
    this.playTone(523, 523, 0.1, 'square', 0.07, 0);
    this.playTone(659, 659, 0.1, 'square', 0.07, 0.1);
    this.playTone(784, 784, 0.1, 'square', 0.07, 0.2);
    this.playTone(1046, 1046, 0.28, 'square', 0.08, 0.3);
  }

  public playDefeat(): void {
    this.playTone(330, 293, 0.18, 'sawtooth', 0.07, 0);
    this.playTone(261, 180, 0.35, 'sawtooth', 0.08, 0.18);
  }

  public playSwordSlash(): void {
    if (!this.canPlay('swordSlash', 45)) return;
    this.playNoiseBurst(
      0.11,
      this.jitter(3200, 0.1),
      2.4,
      0.075,
      'highpass',
      0,
      this.jitter(5800, 0.1)
    );
    this.playTone(
      this.jitter(1480, 0.1),
      this.jitter(2240, 0.1),
      0.085,
      'triangle',
      0.05,
      0.015
    );
    this.playTone(
      this.jitter(2400, 0.09),
      this.jitter(1920, 0.09),
      0.1,
      'sine',
      0.035,
      0.02
    );
  }

  public playPalmImpact(): void {
    if (!this.canPlay('palmImpact', 45)) return;
    this.playTone(this.jitter(118, 0.09), this.jitter(36, 0.09), 0.16, 'sine', 0.13);
    this.playTone(this.jitter(180, 0.1), this.jitter(58, 0.1), 0.1, 'triangle', 0.07);
    this.playNoiseBurst(0.13, this.jitter(520, 0.1), 1.1, 0.095, 'lowpass', 0, 140);
  }

  public playFluteNote(): void {
    if (!this.canPlay('fluteNote', 65)) return;
    const idx = Math.floor(Math.random() * PENTATONIC_FLUTE_NOTES.length);
    const baseFreq = PENTATONIC_FLUTE_NOTES[idx] ?? 523.25;
    this.playTone(baseFreq, baseFreq * 1.005, 0.24, 'sine', 0.055);
    this.playTone(baseFreq * 2, baseFreq * 2.004, 0.18, 'triangle', 0.018, 0.015);
    this.playNoiseBurst(0.09, baseFreq * 2.5, 4.0, 0.016, 'bandpass');
  }

  public playMeridianShatter(): void {
    if (!this.canPlay('meridianShatter', 60)) return;
    this.playNoiseBurst(
      0.07,
      this.jitter(4400, 0.1),
      3.2,
      0.09,
      'bandpass',
      0,
      6200
    );
    this.playNoiseBurst(0.1, this.jitter(2800, 0.1), 2.5, 0.07, 'highpass', 0.025);
    this.playTone(
      this.jitter(1046.5, 0.08),
      this.jitter(1040, 0.08),
      0.34,
      'sine',
      0.085,
      0.015
    );
    this.playTone(
      this.jitter(1568, 0.08),
      this.jitter(1555, 0.08),
      0.28,
      'triangle',
      0.055,
      0.02
    );
    this.playTone(
      this.jitter(2637, 0.08),
      this.jitter(2610, 0.08),
      0.22,
      'sine',
      0.04,
      0.025
    );
  }

  public playPerfectDodge(): void {
    if (!this.canPlay('perfectDodge', 70)) return;
    this.playNoiseBurst(
      0.11,
      this.jitter(1800, 0.1),
      2.2,
      0.08,
      'bandpass',
      0,
      this.jitter(4600, 0.1)
    );
    this.playTone(
      this.jitter(659.25, 0.08),
      this.jitter(783.99, 0.08),
      0.11,
      'sine',
      0.065,
      0.02
    );
    this.playTone(
      this.jitter(987.77, 0.08),
      this.jitter(1318.5, 0.08),
      0.16,
      'triangle',
      0.06,
      0.065
    );
  }

  public playBossTelegraph(): void {
    if (!this.canPlay('bossTelegraph', 100)) return;
    this.playTone(this.jitter(92, 0.08), this.jitter(245, 0.08), 0.34, 'sawtooth', 0.075);
    this.playTone(
      this.jitter(138, 0.08),
      this.jitter(368, 0.08),
      0.34,
      'triangle',
      0.065,
      0.02
    );
    this.playNoiseBurst(0.32, 320, 2.0, 0.045, 'bandpass', 0, 1200);
  }

  public playHeavyCleave(): void {
    if (!this.canPlay('heavyCleave', 55)) return;
    this.playTone(this.jitter(390, 0.09), this.jitter(165, 0.09), 0.22, 'sawtooth', 0.085);
    this.playTone(
      this.jitter(610, 0.09),
      this.jitter(280, 0.09),
      0.18,
      'square',
      0.055,
      0.01
    );
    this.playTone(
      this.jitter(1180, 0.09),
      this.jitter(960, 0.09),
      0.2,
      'triangle',
      0.045,
      0.015
    );
    this.playNoiseBurst(0.2, this.jitter(460, 0.1), 1.3, 0.1, 'lowpass', 0, 130);
    this.playNoiseBurst(0.09, this.jitter(2400, 0.1), 2.5, 0.06, 'bandpass');
  }
}

export const soundFX = new SoundSynth();
