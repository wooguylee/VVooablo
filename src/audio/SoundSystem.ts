/**
 * 사운드 시스템 (WebAudio, 절차적 합성).
 *
 * 저작권 에셋을 쓰지 않고, 오실레이터/노이즈로 효과음을 합성한다.
 * 채널 믹싱: master → (sfx, music) 게인 노드 분리.
 * AudioContext는 사용자 상호작용 후 resume(브라우저 정책).
 */
import type { GameOptions } from '@/save/options';

export type SfxName = 'hit' | 'crit' | 'skill' | 'death' | 'levelup' | 'pickup' | 'potion' | 'ui';

export class SoundSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private options: GameOptions;
  private enabled = true;
  private lastPlay: Map<SfxName, number> = new Map();

  constructor(options: GameOptions) {
    this.options = options;
  }

  /** 사용자 제스처 후 초기화 (자동재생 정책) */
  init(): void {
    if (this.ctx) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.applyVolumes();
    } catch {
      this.enabled = false;
    }
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  applyVolumes(): void {
    if (!this.masterGain || !this.sfxGain || !this.musicGain) return;
    this.masterGain.gain.value = this.options.masterVolume;
    this.sfxGain.gain.value = this.options.sfxVolume;
    this.musicGain.gain.value = this.options.musicVolume;
  }

  setOptions(opts: GameOptions): void {
    this.options = opts;
    this.applyVolumes();
  }

  /** 효과음 재생 (스로틀링으로 과다 재생 방지) */
  play(name: SfxName): void {
    if (!this.enabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const last = this.lastPlay.get(name) ?? -1;
    if (now - last < 0.03) return; // 30ms 스로틀
    this.lastPlay.set(name, now);

    const preset = SFX_PRESETS[name];
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = preset.type;
    osc.frequency.setValueAtTime(preset.freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, preset.freqEnd), now + preset.duration);
    gain.gain.setValueAtTime(preset.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + preset.duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + preset.duration);
  }
}

interface SfxPreset {
  type: OscillatorType;
  freqStart: number;
  freqEnd: number;
  duration: number;
  gain: number;
}

const SFX_PRESETS: Record<SfxName, SfxPreset> = {
  hit: { type: 'square', freqStart: 220, freqEnd: 110, duration: 0.08, gain: 0.25 },
  crit: { type: 'sawtooth', freqStart: 440, freqEnd: 160, duration: 0.12, gain: 0.3 },
  skill: { type: 'triangle', freqStart: 660, freqEnd: 330, duration: 0.15, gain: 0.25 },
  death: { type: 'sawtooth', freqStart: 200, freqEnd: 40, duration: 0.3, gain: 0.3 },
  levelup: { type: 'sine', freqStart: 440, freqEnd: 880, duration: 0.4, gain: 0.3 },
  pickup: { type: 'sine', freqStart: 880, freqEnd: 1320, duration: 0.1, gain: 0.2 },
  potion: { type: 'sine', freqStart: 330, freqEnd: 660, duration: 0.2, gain: 0.22 },
  ui: { type: 'square', freqStart: 520, freqEnd: 520, duration: 0.05, gain: 0.15 },
};
