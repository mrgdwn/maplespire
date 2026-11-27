export type MusicMood = 'silent' | 'camp' | 'combat' | 'boss';

type MusicController = {
  setMood: (mood: MusicMood) => void;
  isMuted: () => boolean;
  toggleMute: () => boolean;
  unlock: () => void;
};

type WindBedHandle = {
  source: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  gain: GainNode;
};

const BGM_MUTE_STORAGE_KEY = 'wuxiaspire_bgm_muted_v1';

// D-minor / Chinese pentatonic scale (Hz)
const NOTE = {
  D3: 146.83,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  C4: 261.63,
  D4: 293.66,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  C5: 523.25,
  D5: 587.33,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
  C6: 1046.5,
};

// 32-step contemplative camp guzheng arpeggio (0 = rest)
const CAMP_GUZHENG_MAIN: readonly number[] = [
  NOTE.D4, 0, NOTE.A4, 0, NOTE.F4, NOTE.G4, 0, NOTE.A4,
  NOTE.C5, 0, NOTE.A4, 0, NOTE.G4, 0, NOTE.F4, 0,
  NOTE.D4, 0, NOTE.F4, 0, NOTE.A4, NOTE.C5, 0, NOTE.D5,
  NOTE.C5, 0, NOTE.A4, 0, NOTE.G4, 0, 0, 0,
];

const CAMP_GUZHENG_BASS: readonly number[] = [
  NOTE.D3, 0, 0, 0, 0, 0, 0, 0,
  NOTE.A3, 0, 0, 0, NOTE.G3, 0, 0, 0,
  NOTE.D3, 0, 0, 0, 0, 0, 0, 0,
  NOTE.F3, 0, 0, 0, NOTE.A3, 0, 0, 0,
];

// 32-step understated combat dizi motif (0 = rest)
const COMBAT_DIZI_MELODY: readonly number[] = [
  NOTE.D5, 0, NOTE.C5, NOTE.A4, 0, 0, NOTE.G4, NOTE.A4,
  NOTE.C5, 0, 0, 0, NOTE.A4, 0, NOTE.G4, 0,
  NOTE.F4, 0, NOTE.G4, NOTE.A4, 0, 0, NOTE.C5, NOTE.D5,
  NOTE.A4, 0, 0, 0, NOTE.G4, 0, 0, 0,
];

// Combat muyu temple block pattern: 0 = rest, 1 = soft, 2 = accent
const COMBAT_MUYU_PATTERN: readonly number[] = [
  2, 0, 1, 0, 1, 0, 2, 1,
  2, 0, 1, 0, 1, 1, 2, 0,
];

// Combat grounding low guzheng plucks
const COMBAT_GUZHENG_BASS: readonly number[] = [
  NOTE.D3, 0, 0, 0, NOTE.A3, 0, NOTE.C4, 0,
  NOTE.D3, 0, 0, 0, NOTE.G3, 0, NOTE.A3, 0,
];

// Boss low-octave urgent guzheng ostinato (16-step loop)
const BOSS_GUZHENG_OSTINATO: readonly number[] = [
  NOTE.D3, NOTE.A3, NOTE.D3, NOTE.F3, NOTE.D3, NOTE.G3, NOTE.A3, NOTE.F3,
  NOTE.D3, NOTE.A3, NOTE.C4, NOTE.A3, NOTE.G3, NOTE.F3, NOTE.A3, NOTE.G3,
];

// Boss taiko war-drum pattern: 0 = rest, 1 = rim/soft, 2 = deep hit, 3 = heavy accent
const BOSS_TAIKO_PATTERN: readonly number[] = [
  3, 0, 0, 1, 2, 0, 2, 0,
  3, 0, 1, 0, 2, 0, 2, 2,
];

// Boss tense high dizi flourishes (32-step cycle)
const BOSS_DIZI_FLOURISH: readonly number[] = [
  0, 0, 0, 0, NOTE.A5, 0, NOTE.G5, NOTE.F5,
  NOTE.D5, 0, 0, 0, 0, 0, NOTE.F5, NOTE.G5,
  NOTE.A5, 0, NOTE.C6, 0, NOTE.A5, 0, NOTE.G5, 0,
  NOTE.F5, 0, 0, 0, NOTE.D5, 0, 0, 0,
];

const MOOD_GAIN: Record<MusicMood, number> = {
  silent: 0,
  camp: 0.11,
  combat: 0.1,
  boss: 0.12,
};

const MOOD_STEP_SECONDS: Record<Exclude<MusicMood, 'silent'>, number> = {
  camp: 0.56,
  combat: 0.22,
  boss: 0.185,
};

const SCHEDULE_AHEAD_SECONDS = 0.16;
const SCHEDULER_TICK_MS = 50;
const FADE_SECONDS = 0.4;

function readStoredMute(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return window.localStorage.getItem(BGM_MUTE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeStoredMute(muted: boolean): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(BGM_MUTE_STORAGE_KEY, muted ? '1' : '0');
  } catch {
    // Ignore storage failures in restricted iFrames
  }
}

class MusicEngine implements MusicController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private warmthFilter: BiquadFilterNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private windNoiseBuffer: AudioBuffer | null = null;

  private muted: boolean = readStoredMute();
  private unlocked: boolean = false;
  private currentMood: MusicMood = 'silent';
  private activeMood: MusicMood = 'silent';

  private schedulerTimer: number | null = null;
  private windFadeTimer: number | null = null;
  private windBed: WindBedHandle | null = null;

  private stepIndex: number = 0;
  private nextStepTime: number = 0;

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    writeStoredMute(this.muted);

    if (this.muted) {
      this.fadeOutAndStop();
    } else if (this.unlocked && this.currentMood !== 'silent') {
      this.ensureAudioGraph();
      this.startMood(this.currentMood);
    }

    return this.muted;
  }

  public unlock(): void {
    this.unlocked = true;
    const ctx = this.ensureAudioGraph();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      void ctx.resume().then(() => {
        if (!this.muted && this.currentMood !== 'silent' && this.activeMood !== this.currentMood) {
          this.startMood(this.currentMood);
        }
      }).catch(() => {
        // Ignore autoplay rejection until next gesture
      });
    } else if (!this.muted && this.currentMood !== 'silent' && this.activeMood !== this.currentMood) {
      this.startMood(this.currentMood);
    }
  }

  public setMood(mood: MusicMood): void {
    this.currentMood = mood;

    if (mood === 'silent') {
      this.fadeOutAndStop();
      return;
    }

    if (this.muted || !this.unlocked) {
      return;
    }

    const ctx = this.ensureAudioGraph();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      void ctx.resume().then(() => {
        if (!this.muted && this.currentMood === mood && this.activeMood !== mood) {
          this.startMood(mood);
        }
      }).catch(() => {
        // Wait for next user gesture via unlock()
      });
      return;
    }

    if (this.activeMood !== mood) {
      this.startMood(mood);
    }
  }

  private ensureAudioGraph(): AudioContext | null {
    if (this.ctx && this.masterGain && this.warmthFilter) {
      return this.ctx;
    }
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext;
    if (!AudioCtx) return null;

    const ctx = new AudioCtx();
    const warmthFilter = ctx.createBiquadFilter();
    warmthFilter.type = 'lowpass';
    warmthFilter.frequency.setValueAtTime(8500, ctx.currentTime);
    warmthFilter.Q.setValueAtTime(0.5, ctx.currentTime);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);

    masterGain.connect(warmthFilter);
    warmthFilter.connect(ctx.destination);

    this.ctx = ctx;
    this.masterGain = masterGain;
    this.warmthFilter = warmthFilter;
    return ctx;
  }

  private startMood(mood: Exclude<MusicMood, 'silent'>): void {
    const ctx = this.ctx;
    const masterGain = this.masterGain;
    if (!ctx || !masterGain) return;

    this.clearScheduler();
    this.clearWindFadeTimer();

    this.activeMood = mood;
    this.stepIndex = 0;
    this.nextStepTime = ctx.currentTime + 0.08;

    const now = ctx.currentTime;
    const targetGain = MOOD_GAIN[mood];
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(Math.max(0.0001, masterGain.gain.value), now);
    masterGain.gain.linearRampToValueAtTime(targetGain, now + FADE_SECONDS);

    if (mood === 'camp') {
      this.startWindBed(ctx, masterGain);
    } else {
      this.stopWindBed();
    }

    this.scheduleAhead();
    this.schedulerTimer = window.setInterval(() => {
      this.scheduleAhead();
    }, SCHEDULER_TICK_MS);
  }

  private fadeOutAndStop(): void {
    this.clearScheduler();
    this.activeMood = 'silent';

    const ctx = this.ctx;
    const masterGain = this.masterGain;
    if (!ctx || !masterGain) {
      this.stopWindBed();
      return;
    }

    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(Math.max(0.0001, masterGain.gain.value), now);
    masterGain.gain.linearRampToValueAtTime(0.0001, now + FADE_SECONDS);

    this.clearWindFadeTimer();
    this.windFadeTimer = window.setTimeout(() => {
      this.windFadeTimer = null;
      if (this.activeMood !== 'camp') {
        this.stopWindBed();
      }
    }, Math.ceil((FADE_SECONDS + 0.08) * 1000));
  }

  private clearScheduler(): void {
    if (this.schedulerTimer !== null) {
      window.clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  private clearWindFadeTimer(): void {
    if (this.windFadeTimer !== null) {
      window.clearTimeout(this.windFadeTimer);
      this.windFadeTimer = null;
    }
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const frameCount = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private getWindNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.windNoiseBuffer && this.windNoiseBuffer.sampleRate === ctx.sampleRate) {
      return this.windNoiseBuffer;
    }
    const frameCount = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Softly smoothed noise for gentle misty mountain breeze
    let last = 0;
    for (let i = 0; i < frameCount; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.04 * white) / 1.04;
      data[i] = last * 2.6;
    }
    this.windNoiseBuffer = buffer;
    return buffer;
  }

  private startWindBed(ctx: AudioContext, dest: AudioNode): void {
    if (this.windBed) return;

    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = this.getWindNoiseBuffer(ctx);
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(440, now);
    filter.Q.setValueAtTime(1.4, now);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.11, now);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(150, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.9);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    source.start(now);
    lfo.start(now);

    this.windBed = { source, filter, lfo, lfoGain, gain };
  }

  private stopWindBed(): void {
    const bed = this.windBed;
    if (!bed) return;
    this.windBed = null;

    try {
      bed.source.stop();
    } catch {
      // Already stopped
    }
    try {
      bed.lfo.stop();
    } catch {
      // Already stopped
    }
    bed.source.disconnect();
    bed.filter.disconnect();
    bed.lfo.disconnect();
    bed.lfoGain.disconnect();
    bed.gain.disconnect();
  }

  private scheduleAhead(): void {
    const ctx = this.ctx;
    const masterGain = this.masterGain;
    if (!ctx || !masterGain || this.muted || this.activeMood === 'silent') {
      return;
    }

    const mood = this.activeMood;
    const stepDuration = MOOD_STEP_SECONDS[mood];

    // Guard against tab-backgrounding catch-up bursts
    if (this.nextStepTime < ctx.currentTime - 0.5) {
      this.nextStepTime = ctx.currentTime + 0.05;
    }

    while (this.nextStepTime < ctx.currentTime + SCHEDULE_AHEAD_SECONDS) {
      this.scheduleStep(ctx, masterGain, mood, this.stepIndex, this.nextStepTime);
      this.stepIndex = (this.stepIndex + 1) % 32;
      this.nextStepTime += stepDuration;
    }
  }

  private scheduleStep(
    ctx: AudioContext,
    dest: AudioNode,
    mood: Exclude<MusicMood, 'silent'>,
    step: number,
    time: number
  ): void {
    if (mood === 'camp') {
      const mainNote = CAMP_GUZHENG_MAIN[step % CAMP_GUZHENG_MAIN.length] ?? 0;
      const bassNote = CAMP_GUZHENG_BASS[step % CAMP_GUZHENG_BASS.length] ?? 0;

      if (bassNote > 0) {
        this.playGuzheng(ctx, dest, bassNote, time, 1.85, 0.24, false);
      }
      if (mainNote > 0) {
        const grace = step === 4 || step === 20;
        this.playGuzheng(ctx, dest, mainNote, time, 1.45, 0.34, grace);
      }
      return;
    }

    if (mood === 'combat') {
      const muyuHit = COMBAT_MUYU_PATTERN[step % COMBAT_MUYU_PATTERN.length] ?? 0;
      const bassNote = COMBAT_GUZHENG_BASS[step % COMBAT_GUZHENG_BASS.length] ?? 0;
      const diziNote = COMBAT_DIZI_MELODY[step % COMBAT_DIZI_MELODY.length] ?? 0;

      if (muyuHit > 0) {
        this.playMuyu(ctx, dest, time, muyuHit === 2);
      }
      if (bassNote > 0) {
        this.playGuzheng(ctx, dest, bassNote, time, 0.52, 0.22, false);
      }
      if (diziNote > 0) {
        const isSustained = step % 8 === 0;
        this.playDizi(ctx, dest, diziNote, time, isSustained ? 0.58 : 0.34, 0.27, isSustained);
      }
      return;
    }

    // mood === 'boss'
    const taikoHit = BOSS_TAIKO_PATTERN[step % BOSS_TAIKO_PATTERN.length] ?? 0;
    const ostinatoNote = BOSS_GUZHENG_OSTINATO[step % BOSS_GUZHENG_OSTINATO.length] ?? 0;
    const flourishNote = BOSS_DIZI_FLOURISH[step % BOSS_DIZI_FLOURISH.length] ?? 0;

    if (taikoHit > 0) {
      this.playTaiko(ctx, dest, time, taikoHit);
    }
    if (ostinatoNote > 0) {
      const accent = step % 4 === 0 ? 0.29 : 0.2;
      this.playGuzheng(ctx, dest, ostinatoNote, time, 0.36, accent, false);
    }
    if (flourishNote > 0) {
      this.playDizi(ctx, dest, flourishNote, time, 0.42, 0.25, true);
    }
  }

  private playGuzheng(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    time: number,
    duration: number,
    level: number,
    withGrace: boolean
  ): void {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(5200, freq * 4.5), time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(220, freq * 1.35), time + Math.min(0.45, duration * 0.6));
    filter.Q.setValueAtTime(1.1, time);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(level, time + 0.007);
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    const primary = ctx.createOscillator();
    primary.type = 'triangle';
    if (withGrace) {
      primary.frequency.setValueAtTime(freq * 0.94, time);
      primary.frequency.exponentialRampToValueAtTime(freq, time + 0.055);
    } else {
      primary.frequency.setValueAtTime(freq, time);
    }

    const detuneVoice = ctx.createOscillator();
    detuneVoice.type = 'sine';
    detuneVoice.frequency.setValueAtTime(freq * 1.003, time);

    const detuneGain = ctx.createGain();
    detuneGain.gain.setValueAtTime(0.45, time);

    const overtone = ctx.createOscillator();
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(freq * 2, time);

    const overtoneGain = ctx.createGain();
    overtoneGain.gain.setValueAtTime(0.22, time);
    overtoneGain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.45);

    primary.connect(filter);
    detuneVoice.connect(detuneGain);
    detuneGain.connect(filter);
    overtone.connect(overtoneGain);
    overtoneGain.connect(filter);

    filter.connect(env);
    env.connect(dest);

    primary.start(time);
    detuneVoice.start(time);
    overtone.start(time);

    const stopAt = time + duration + 0.02;
    primary.stop(stopAt);
    detuneVoice.stop(stopAt);
    overtone.stop(stopAt);
  }

  private playDizi(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    time: number,
    duration: number,
    level: number,
    vibrato: boolean
  ): void {
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(level, time + 0.045);
    env.gain.setValueAtTime(level * 0.88, time + Math.max(0.06, duration * 0.65));
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.992, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.04);

    const harmonic = ctx.createOscillator();
    harmonic.type = 'triangle';
    harmonic.frequency.setValueAtTime(freq * 2, time);

    const harmonicGain = ctx.createGain();
    harmonicGain.gain.setValueAtTime(0.16, time);

    osc.connect(env);
    harmonic.connect(harmonicGain);
    harmonicGain.connect(env);
    env.connect(dest);

    let vibOsc: OscillatorNode | null = null;
    if (vibrato) {
      vibOsc = ctx.createOscillator();
      vibOsc.type = 'sine';
      vibOsc.frequency.setValueAtTime(5.4, time);
      const vibGain = ctx.createGain();
      vibGain.gain.setValueAtTime(0.0001, time);
      vibGain.gain.linearRampToValueAtTime(freq * 0.008, time + 0.14);
      vibOsc.connect(vibGain);
      vibGain.connect(osc.frequency);
      vibOsc.start(time);
    }

    // Subtle bamboo breath chiff on note onset
    const breath = ctx.createBufferSource();
    breath.buffer = this.getNoiseBuffer(ctx);
    const breathFilter = ctx.createBiquadFilter();
    breathFilter.type = 'bandpass';
    breathFilter.frequency.setValueAtTime(Math.min(6000, freq * 2.4), time);
    breathFilter.Q.setValueAtTime(5.0, time);

    const breathGain = ctx.createGain();
    breathGain.gain.setValueAtTime(0.0001, time);
    breathGain.gain.linearRampToValueAtTime(level * 0.18, time + 0.02);
    breathGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);

    breath.connect(breathFilter);
    breathFilter.connect(breathGain);
    breathGain.connect(dest);

    const stopAt = time + duration + 0.02;
    osc.start(time);
    harmonic.start(time);
    breath.start(time, Math.random() * 0.5);

    osc.stop(stopAt);
    harmonic.stop(stopAt);
    breath.stop(time + 0.13);
    if (vibOsc) {
      vibOsc.stop(stopAt);
    }
  }

  private playMuyu(ctx: AudioContext, dest: AudioNode, time: number, accent: boolean): void {
    const startFreq = accent ? 920 : 760;
    const endFreq = accent ? 620 : 510;
    const level = accent ? 0.24 : 0.14;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.045);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.065);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.075);

    // Crisp hollow wood click transient
    const click = ctx.createBufferSource();
    click.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(accent ? 2100 : 1700, time);
    filter.Q.setValueAtTime(3.6, time);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(level * 0.45, time);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.022);

    click.connect(filter);
    filter.connect(clickGain);
    clickGain.connect(dest);
    click.start(time, Math.random() * 0.5);
    click.stop(time + 0.03);
  }

  private playTaiko(ctx: AudioContext, dest: AudioNode, time: number, intensity: number): void {
    const isHeavy = intensity >= 3;
    const isSoft = intensity === 1;
    const duration = isHeavy ? 0.34 : isSoft ? 0.16 : 0.25;
    const level = isHeavy ? 0.52 : isSoft ? 0.22 : 0.38;

    const body = ctx.createOscillator();
    body.type = 'sine';
    body.frequency.setValueAtTime(isHeavy ? 128 : isSoft ? 148 : 114, time);
    body.frequency.exponentialRampToValueAtTime(isHeavy ? 46 : 54, time + duration);

    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.0001, time);
    bodyGain.gain.linearRampToValueAtTime(level, time + 0.006);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    body.connect(bodyGain);
    bodyGain.connect(dest);
    body.start(time);
    body.stop(time + duration + 0.02);

    // Warm skin overtone
    const skin = ctx.createOscillator();
    skin.type = 'triangle';
    skin.frequency.setValueAtTime(isHeavy ? 196 : 220, time);
    skin.frequency.exponentialRampToValueAtTime(84, time + 0.12);

    const skinGain = ctx.createGain();
    skinGain.gain.setValueAtTime(level * 0.28, time);
    skinGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);

    skin.connect(skinGain);
    skinGain.connect(dest);
    skin.start(time);
    skin.stop(time + 0.14);

    // Bachi stick impact
    const impact = ctx.createBufferSource();
    impact.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isHeavy ? 420 : 620, time);

    const impactGain = ctx.createGain();
    impactGain.gain.setValueAtTime(level * 0.35, time);
    impactGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);

    impact.connect(filter);
    filter.connect(impactGain);
    impactGain.connect(dest);
    impact.start(time, Math.random() * 0.5);
    impact.stop(time + 0.065);
  }
}

export const musicFX: MusicController = new MusicEngine();
