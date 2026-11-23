import type { MusicConfig } from '../types/showcase';

// Romantic chord progressions in Hz for built-in gentle fallback presets
const SUNSET_BOX_PATTERN = [
  // Fmaj7
  349.23, 440.0, 523.25, 659.25, 523.25, 440.0,
  // Em7
  329.63, 392.0, 493.88, 587.33, 493.88, 392.0,
  // Dm7
  293.66, 349.23, 440.0, 523.25, 440.0, 349.23,
  // Cmaj7
  261.63, 329.63, 392.0, 493.88, 523.25, 392.0,
];

const STARLIGHT_CHIME_PATTERN = [
  // Dmaj9 dreamy lullaby
  293.66, 369.99, 440.0, 554.37, 659.25, 554.37,
  // Bm7
  246.94, 369.99, 440.0, 587.33, 440.0, 369.99,
  // Gmaj7
  196.0, 293.66, 369.99, 493.88, 587.33, 493.88,
  // A6
  220.0, 329.63, 440.0, 554.37, 659.25, 440.0,
];

export class LoveAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private customObjectUrl: string | null = null;
  private stepTimer: number | null = null;
  private stepIndex = 0;
  private isPlaying = false;
  private config: MusicConfig = {
    source: 'sunset-box',
    customTrackName: null,
    customTrackSize: null,
    volume: 0.65,
    loop: true,
    heartChimeEnabled: true,
  };
  private onEndedCallback: (() => void) | null = null;

  public setOnEnded(cb: () => void): void {
    this.onEndedCallback = cb;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.config.volume * 0.45;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public setCustomAudioBlob(blob: Blob | null): void {
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.src = '';
    }
    if (this.customObjectUrl) {
      URL.revokeObjectURL(this.customObjectUrl);
      this.customObjectUrl = null;
    }

    if (blob) {
      this.customObjectUrl = URL.createObjectURL(blob);
      if (!this.audioEl) {
        this.audioEl = new Audio();
        this.audioEl.preload = 'auto';
        this.audioEl.addEventListener('ended', () => {
          if (!this.config.loop) {
            this.isPlaying = false;
            this.onEndedCallback?.();
          }
        });
      }
      this.audioEl.src = this.customObjectUrl;
      this.audioEl.loop = this.config.loop;
      this.audioEl.volume = this.config.volume;

      if (this.isPlaying && this.config.source === 'custom') {
        void this.audioEl.play().catch(() => {
          // autoplay blocked until next click
        });
      }
    }
  }

  public hasCustomAudio(): boolean {
    return Boolean(this.customObjectUrl && this.audioEl);
  }

  public updateConfig(next: MusicConfig): void {
    const sourceChanged = next.source !== this.config.source;
    this.config = { ...next };

    if (this.audioEl) {
      this.audioEl.volume = Math.max(0, Math.min(1, next.volume));
      this.audioEl.loop = next.loop;
    }

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        Math.max(0.0001, next.volume * 0.45),
        this.ctx.currentTime,
        0.08,
      );
    }

    if (sourceChanged && this.isPlaying) {
      this.stopPlaybackOnly();
      void this.start();
    }
  }

  public async start(): Promise<boolean> {
    this.isPlaying = true;
    this.stopPlaybackOnly();

    if (this.config.source === 'custom' && this.audioEl && this.customObjectUrl) {
      this.audioEl.loop = this.config.loop;
      this.audioEl.volume = Math.max(0, Math.min(1, this.config.volume));
      try {
        await this.audioEl.play();
        return true;
      } catch {
        this.isPlaying = false;
        return false;
      }
    }

    // Fallback or selected built-in romantic Web Audio music box
    const ctx = this.ensureContext();
    if (!ctx) {
      this.isPlaying = false;
      return false;
    }

    const pattern =
      this.config.source === 'starlight-chime' ? STARLIGHT_CHIME_PATTERN : SUNSET_BOX_PATTERN;
    const tempoMs = this.config.source === 'starlight-chime' ? 680 : 560;

    this.playBoxNote(pattern[this.stepIndex % pattern.length], 1.7);
    this.stepIndex += 1;

    this.stepTimer = window.setInterval(() => {
      if (!this.isPlaying) return;
      const freq = pattern[this.stepIndex % pattern.length];
      const isDownbeat = this.stepIndex % 6 === 0;
      this.playBoxNote(freq, isDownbeat ? 2.2 : 1.5, isDownbeat ? 0.24 : 0.17);
      if (isDownbeat) {
        // Warm low octave pad whisper
        this.playWarmPad(freq * 0.5, 3.1, 0.1);
      }
      this.stepIndex += 1;
    }, tempoMs);

    return true;
  }

  public stop(): void {
    this.isPlaying = false;
    this.stopPlaybackOnly();
  }

  private stopPlaybackOnly(): void {
    if (this.stepTimer !== null) {
      window.clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
    if (this.audioEl) {
      this.audioEl.pause();
    }
  }

  public playHeartChime(): void {
    if (!this.config.heartChimeEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Gentle major-ninth harmonic arpeggio sparkle
    const notes = [523.25, 659.25, 783.99, 987.77];
    notes.forEach((freq, idx) => {
      window.setTimeout(() => {
        this.playBoxNote(freq, 1.35, 0.16);
      }, idx * 55);
    });
  }

  public playFrameChime(): void {
    if (!this.config.heartChimeEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.playBoxNote(659.25, 0.9, 0.12);
    window.setTimeout(() => this.playBoxNote(783.99, 1.1, 0.1), 65);
  }

  private playBoxNote(freq: number, duration: number, peak = 0.18): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const overtone = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const overtoneGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 2, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    overtoneGain.gain.setValueAtTime(0.0001, now);
    overtoneGain.gain.exponentialRampToValueAtTime(peak * 0.22, now + 0.015);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.45);

    osc.connect(gain);
    overtone.connect(overtoneGain);
    overtoneGain.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    overtone.start(now);
    osc.stop(now + duration + 0.05);
    overtone.stop(now + duration * 0.5 + 0.05);
  }

  private playWarmPad(freq: number, duration: number, peak = 0.09): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.45);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.08);
  }

  public dispose(): void {
    this.stop();
    if (this.customObjectUrl) {
      URL.revokeObjectURL(this.customObjectUrl);
      this.customObjectUrl = null;
    }
    if (this.audioEl) {
      this.audioEl.src = '';
      this.audioEl = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
    }
  }
}
