import type { TrackMetadata } from "./types";

export interface PlaybackEngine {
  load(track: TrackMetadata): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  stop(): void;
  seek(time: number): void;
  setVolume(value: number): void;
  mute(): void;
  unMute(): void;
  getDuration(): number;
  getCurrentTime(): number;
  getVolume(): number;
  onEnded(callback: () => void): void;
  onError(callback: (error: Error) => void): void;
  destroy(): void;
  fadeIn(duration: number, targetVolume?: number): Promise<void>;
  fadeOut(duration: number): Promise<void>;
  cancelFade(): void;
}
