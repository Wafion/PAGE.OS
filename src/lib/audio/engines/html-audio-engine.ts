import type { PlaybackEngine } from "../playback-types";
import type { TrackMetadata } from "../types";

export class HTMLAudioPlaybackEngine implements PlaybackEngine {
  private audio: HTMLAudioElement;
  private onEndedCb: (() => void) | null = null;
  private onErrorCb: ((error: Error) => void) | null = null;
  private _muted = false;

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
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  seek(time: number): void {
    this.audio.currentTime = time;
  }

  setVolume(value: number): void {
    this.audio.volume = Math.max(0, Math.min(1, value));
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

  onEnded(callback: () => void): void {
    this.onEndedCb = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCb = callback;
  }

  destroy(): void {
    this.audio.pause();
    this.audio.src = "";
    this.audio.load();
    this.onEndedCb = null;
    this.onErrorCb = null;
  }
}
