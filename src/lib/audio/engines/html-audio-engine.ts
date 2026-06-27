import type { PlaybackEngine } from "../playback-types";
import type { TrackMetadata } from "../types";

export class HTMLAudioPlaybackEngine implements PlaybackEngine {
  private audio: HTMLAudioElement;
  private onEndedCb: (() => void) | null = null;
  private onErrorCb: ((error: Error) => void) | null = null;
  private _muted = false;
  private _targetVolume = 1;
  private _fadeTimer: number | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = "auto";
    this.audio.addEventListener("ended", () => this.onEndedCb?.());
    this.audio.addEventListener("error", () => this.onErrorCb?.(new Error("Audio playback error")));
  }

  async load(track: TrackMetadata): Promise<void> {
    if (!track.streamURL) throw new Error("No stream URL for HTML playback");
    this.audio.src = track.streamURL;
    this.audio.load();
    if (this.audio.readyState < 1) {
      await new Promise<void>((resolve, reject) => {
        const onMeta = () => { this.audio.removeEventListener('loadedmetadata', onMeta); resolve(); };
        const onError = () => { this.audio.removeEventListener('error', onError); reject(new Error('Failed to load audio metadata')); };
        this.audio.addEventListener('loadedmetadata', onMeta, { once: true });
        this.audio.addEventListener('error', onError, { once: true });
      });
    }
  }

  async play(): Promise<void> {
    try {
      await this.audio.play();
    } catch {
      // autoplay denied, silence handled by caller
    }
  }

  pause(): void {
    this.audio.pause();
  }

  stop(): void {
    this.cancelFade();
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  seek(time: number): void {
    this.audio.currentTime = time;
  }

  setVolume(value: number): void {
    this._targetVolume = isNaN(value) ? 0 : Math.max(0, Math.min(1, value));
    if (this._fadeTimer === null) {
      this.audio.volume = this._targetVolume;
    }
  }

  mute(): void {
    this._muted = true;
    this.audio.muted = true;
  }

  unMute(): void {
    this._muted = false;
    this.audio.muted = false;
  }

  getDuration(): number {
    return this.audio.duration || 0;
  }

  getCurrentTime(): number {
    return this.audio.currentTime;
  }

  getVolume(): number {
    return this.audio.volume;
  }

  onEnded(callback: () => void): void {
    this.onEndedCb = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCb = callback;
  }

  async fadeIn(duration: number, targetVolume?: number): Promise<void> {
    this.cancelFade();
    const target = Math.min(1, Math.max(0, targetVolume ?? this._targetVolume));
    this.audio.volume = 0;

    return new Promise<void>((resolve) => {
      const start = performance.now();

      const step = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const vol = progress * target;
        this.audio.volume = vol < 0 || isNaN(vol) ? 0 : Math.min(1, vol);

        if (progress < 1) {
          this._fadeTimer = requestAnimationFrame(step);
        } else {
          this._fadeTimer = null;
          const end = target < 0 || isNaN(target) ? 0 : Math.min(1, target);
          this.audio.volume = end;
          resolve();
        }
      };

      this._fadeTimer = requestAnimationFrame(step);
    });
  }

  async fadeOut(duration: number): Promise<void> {
    this.cancelFade();
    const startVol = this.audio.volume;

    if (startVol <= 0 || isNaN(startVol)) return;

    return new Promise<void>((resolve) => {
      const start = performance.now();

      const step = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const vol = startVol * (1 - progress);
        this.audio.volume = vol < 0 || isNaN(vol) ? 0 : Math.min(1, vol);

        if (progress < 1) {
          this._fadeTimer = requestAnimationFrame(step);
        } else {
          this._fadeTimer = null;
          this.audio.volume = 0;
          resolve();
        }
      };

      this._fadeTimer = requestAnimationFrame(step);
    });
  }

  destroy(): void {
    this.cancelFade();
    this.audio.volume = 0;
    this.audio.pause();
    this.audio.src = "";
    this.audio.load();
    this.onEndedCb = null;
    this.onErrorCb = null;
  }

  cancelFade(): void {
    if (this._fadeTimer !== null) {
      cancelAnimationFrame(this._fadeTimer);
      this._fadeTimer = null;
    }
  }
}
