const SFX_MUTE_STORAGE_KEY = 'wuxiaspire_sfx_muted_v1';

const PENTATONIC_FLUTE_NOTES: readonly number[] = [
  523.25, 587.33, 659.25, 783.99, 880,
];

function readStoredSfxMute(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return window.localStorage.getItem(SFX_MUTE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeStoredSfxMute(muted: boolean): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(SFX_MUTE_STORAGE_KEY, muted ? '1' : '0');
  } catch {
    // Ignore storage failures in restricted iFrames
  }
}

class SoundSynth {
  private ctx: AudioContext | null = null;
  private muted: boolean = readStoredSfxMute();
  private noiseBuffer: AudioBuffer | null = null;
  private lastPlayedAt: Map<string, number> = new Map();

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {
          // Ignore autoplay rejection until next user gesture
        });
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

    gain.gain.setValueAtTime(0.0008, now);
    gain.gain.linearRampToValueAtTime(Math.max(0.001, gainLevel), now + Math.min(0.006, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
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
    source.stop(now + duration + 0.01);
  }

  private playBronzeChime(
    baseFreq: number,
    duration: number,
    gainLevel: number,
    delay: number = 0
  ): void {
    // Antique bronze coin / jade bell harmonic partials
    this.playTone(baseFreq, baseFreq * 0.996, duration, 'sine', gainLevel, delay);
    this.playTone(baseFreq * 2.0, baseFreq * 1.992, duration * 0.72, 'triangle', gainLevel * 0.42, delay);
    this.playTone(baseFreq * 2.76, baseFreq * 2.75, duration * 0.45, 'sine', gainLevel * 0.26, delay);
  }

  private playTempleGong(
    fundamental: number,
    duration: number,
    gainLevel: number,
    delay: number = 0
  ): void {
    // Resonant bronze temple gong with inharmonic shimmer partials
    this.playTone(fundamental, fundamental * 0.96, duration, 'sine', gainLevel, delay);
    this.playTone(fundamental * 1.52, fundamental * 1.48, duration * 0.85, 'triangle', gainLevel * 0.55, delay + 0.01);
    this.playTone(fundamental * 2.38, fundamental * 2.33, duration * 0.65, 'sine', gainLevel * 0.34, delay + 0.015);
    this.playTone(fundamental * 3.17, fundamental * 3.12, duration * 0.45, 'sine', gainLevel * 0.18, delay + 0.02);
    this.playNoiseBurst(
      Math.min(0.42, duration * 0.5),
      fundamental * 4.2,
      1.6,
      gainLevel * 0.48,
      'bandpass',
      delay,
      fundamental * 1.8
    );
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    writeStoredSfxMute(this.muted);
    return this.muted;
  }

  public playSwing(): void {
    if (!this.canPlay('swing', 45)) return;
    // Crisp bamboo/silk air cut
    this.playTone(this.jitter(240, 0.1), this.jitter(95, 0.1), 0.1, 'triangle', 0.065);
    this.playNoiseBurst(
      0.09,
      this.jitter(2100, 0.12),
      1.8,
      0.055,
      'bandpass',
      0,
      this.jitter(920, 0.1)
    );
  }

  public playSpell(): void {
    if (!this.canPlay('spell', 45)) return;
    this.playTone(this.jitter(480, 0.09), this.jitter(880, 0.09), 0.14, 'triangle', 0.07);
    this.playTone(this.jitter(720, 0.08), this.jitter(1174, 0.08), 0.12, 'sine', 0.035, 0.015);
  }

  public playArrow(): void {
    if (!this.canPlay('arrow', 45)) return;
    // Taut bowstring twang + bamboo shaft air whistle
    this.playTone(this.jitter(540, 0.09), this.jitter(230, 0.09), 0.08, 'triangle', 0.055);
    this.playNoiseBurst(
      0.065,
      this.jitter(2800, 0.1),
      2.6,
      0.045,
      'bandpass',
      0.005,
      this.jitter(1400, 0.1)
    );
  }

  public playCrit(): void {
    if (!this.canPlay('crit', 50)) return;
    // Resonant steel chime + bright silk flash
    this.playBronzeChime(this.jitter(880, 0.07), 0.18, 0.075, 0);
    this.playTone(this.jitter(1318.5, 0.08), this.jitter(1760, 0.08), 0.12, 'triangle', 0.055, 0.025);
    this.playNoiseBurst(0.065, this.jitter(3800, 0.1), 2.4, 0.06, 'highpass');
  }

  public playHit(): void {
    if (!this.canPlay('hit', 45)) return;
    // Solid martial impact thud
    this.playTone(this.jitter(145, 0.1), this.jitter(52, 0.1), 0.095, 'triangle', 0.08);
    this.playTone(this.jitter(98, 0.08), 44, 0.08, 'sine', 0.075);
    this.playNoiseBurst(0.055, this.jitter(880, 0.12), 1.2, 0.055, 'lowpass');
  }

  public playDash(): void {
    if (!this.canPlay('dash', 55)) return;
    // Crisp bamboo/silk Qinggong wind-step swish
    this.playNoiseBurst(
      0.13,
      this.jitter(1250, 0.1),
      2.0,
      0.075,
      'bandpass',
      0,
      this.jitter(3100, 0.1)
    );
    this.playNoiseBurst(0.09, this.jitter(3600, 0.1), 2.8, 0.035, 'highpass', 0.015);
    this.playTone(this.jitter(340, 0.09), this.jitter(640, 0.09), 0.1, 'sine', 0.038);
  }

  public playCoin(): void {
    if (!this.canPlay('coin', 45)) return;
    // Antique bronze coin chime with warm harmonic overtones
    this.playBronzeChime(this.jitter(1174.66, 0.05), 0.14, 0.058, 0);
    this.playBronzeChime(this.jitter(1567.98, 0.05), 0.19, 0.052, 0.052);
  }

  public playDraft(): void {
    // Crisp scroll silk swish + warm pentatonic jade chime
    this.playNoiseBurst(0.09, 1800, 2.2, 0.04, 'bandpass', 0, 3200);
    this.playBronzeChime(587.33, 0.16, 0.06, 0.01);
    this.playBronzeChime(880.0, 0.24, 0.065, 0.075);
  }

  public playRouletteTick(): void {
    if (!this.canPlay('rouletteTick', 30)) return;
    // Crisp wooden temple-block / bamboo clack
    this.playTone(this.jitter(840, 0.07), this.jitter(540, 0.07), 0.042, 'sine', 0.05);
    this.playNoiseBurst(0.022, this.jitter(1900, 0.1), 3.4, 0.03, 'bandpass');
  }

  public playBossRoar(): void {
    if (!this.canPlay('bossRoar', 120)) return;
    // Resonant deep war-gong + taiko rumble
    this.playTone(this.jitter(112, 0.06), this.jitter(42, 0.06), 0.44, 'sine', 0.13);
    this.playTempleGong(this.jitter(132, 0.05), 0.65, 0.095, 0.02);
    this.playNoiseBurst(
      0.38,
      this.jitter(360, 0.1),
      1.4,
      0.085,
      'lowpass',
      0.01,
      140
    );
  }

  public playVictory(): void {
    // Resonant temple gong + ascending D-pentatonic jade chime fanfare
    this.playTempleGong(146.83, 0.95, 0.085, 0);
    this.playBronzeChime(587.33, 0.24, 0.065, 0.04);
    this.playBronzeChime(698.46, 0.24, 0.065, 0.14);
    this.playBronzeChime(880.0, 0.28, 0.07, 0.24);
    this.playBronzeChime(1174.66, 0.48, 0.08, 0.34);
  }

  public playDefeat(): void {
    // Somber temple bell toll + descending pentatonic sigh
    this.playTempleGong(110.0, 0.72, 0.08, 0);
    this.playTone(349.23, 293.66, 0.22, 'triangle', 0.06, 0.06);
    this.playTone(261.63, 196.0, 0.42, 'sine', 0.075, 0.24);
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
    // Ominous rising bronze singing-bowl / war-horn swell
    this.playTone(this.jitter(98, 0.07), this.jitter(220, 0.07), 0.34, 'triangle', 0.08);
    this.playTone(
      this.jitter(147, 0.07),
      this.jitter(330, 0.07),
      0.34,
      'sine',
      0.065,
      0.02
    );
    this.playNoiseBurst(0.32, 340, 2.2, 0.045, 'bandpass', 0, 1280);
  }

  public playHeavyCleave(): void {
    if (!this.canPlay('heavyCleave', 55)) return;
    // Heavy saber wind-cleave + deep taiko impact + steel ring
    this.playTone(this.jitter(320, 0.09), this.jitter(120, 0.09), 0.22, 'triangle', 0.085);
    this.playTone(this.jitter(124, 0.08), this.jitter(46, 0.08), 0.2, 'sine', 0.095, 0.005);
    this.playTone(
      this.jitter(1180, 0.09),
      this.jitter(940, 0.09),
      0.22,
      'sine',
      0.045,
      0.015
    );
    this.playNoiseBurst(0.2, this.jitter(460, 0.1), 1.3, 0.1, 'lowpass', 0, 130);
    this.playNoiseBurst(0.095, this.jitter(2400, 0.1), 2.5, 0.06, 'bandpass');
  }
}

export const soundFX = new SoundSynth();
