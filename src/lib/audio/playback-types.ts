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
  onEnded(callback: () => void): void;
  onError(callback: (error: Error) => void): void;
  destroy(): void;
}
