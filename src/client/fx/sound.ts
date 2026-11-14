class SoundSynth {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

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
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);

    gain.gain.setValueAtTime(gainLevel, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  public playSwing(): void {
    this.playTone(260, 90, 0.1, 'sawtooth', 0.08);
  }

  public playSpell(): void {
    this.playTone(480, 880, 0.14, 'triangle', 0.07);
  }

  public playArrow(): void {
    this.playTone(620, 220, 0.08, 'square', 0.05);
  }

  public playCrit(): void {
    this.playTone(540, 1080, 0.09, 'square', 0.09);
    this.playTone(820, 1320, 0.11, 'triangle', 0.08, 0.04);
  }

  public playHit(): void {
    this.playTone(150, 65, 0.09, 'sawtooth', 0.07);
  }

  public playCoin(): void {
    this.playTone(980, 1420, 0.07, 'square', 0.05);
    this.playTone(1320, 1760, 0.09, 'square', 0.05, 0.05);
  }

  public playDraft(): void {
    this.playTone(440, 554, 0.09, 'triangle', 0.07);
    this.playTone(659, 880, 0.14, 'triangle', 0.07, 0.06);
  }

  public playRouletteTick(): void {
    this.playTone(720, 480, 0.04, 'square', 0.04);
  }

  public playBossRoar(): void {
    this.playTone(140, 48, 0.35, 'sawtooth', 0.12);
    this.playTone(110, 42, 0.35, 'square', 0.08, 0.05);
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
}

export const soundFX = new SoundSynth();
