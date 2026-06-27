import type { PlaybackEngine } from "../playback-types";
import type { TrackMetadata } from "../types";

let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();

  if (!apiLoadPromise) {
    apiLoadPromise = new Promise<void>((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve();
      };
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      document.head.appendChild(tag);
    });
  }
  return apiLoadPromise;
}

function createPlayerContainer(): HTMLDivElement {
  const id = `yt-player-${Math.random().toString(36).slice(2, 9)}`;
  const div = document.createElement("div");
  div.id = id;
  div.style.position = "absolute";
  div.style.left = "-9999px";
  div.style.width = "1px";
  div.style.height = "1px";
  div.style.overflow = "hidden";
  document.body.appendChild(div);
  return div;
}

let playerInstance: YT.Player | null = null;
let playerContainer: HTMLDivElement | null = null;
let playerRefCount = 0;

function acquirePlayer(videoId: string): Promise<YT.Player> {
  return new Promise<YT.Player>(async (resolve, reject) => {
    if (playerInstance) {
      resolve(playerInstance);
      return;
    }

    playerContainer = createPlayerContainer();
    playerRefCount++;

    await loadYouTubeAPI();

    playerInstance = new YT.Player(playerContainer.id, {
      videoId,
      height: 1,
      width: 1,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        iv_load_policy: 3,
      },
      events: {
        onReady: () => resolve(playerInstance!),
        onError: () => reject(new Error("YouTube player error")),
      },
    });
  });
}

function releasePlayer(): void {
  playerRefCount--;
  if (playerRefCount <= 0) {
    playerInstance?.destroy();
    playerInstance = null;
    if (playerContainer) {
      playerContainer.remove();
      playerContainer = null;
    }
    playerRefCount = 0;
  }
}

export class YouTubePlaybackEngine implements PlaybackEngine {
  private videoId: string | null = null;
  private volume = 0.5;
  private onEndedCb: (() => void) | null = null;
  private onErrorCb: ((error: Error) => void) | null = null;
  private stateCheckInterval: ReturnType<typeof setInterval> | null = null;
  private _fading = false;

  async load(track: TrackMetadata): Promise<void> {
    if (!track.videoID) throw new Error("No video ID for YouTube playback");
    this.cleanup();

    this.videoId = track.videoID;

    await acquirePlayer(track.videoID);

    if (playerInstance) {
      playerInstance.loadVideoById(track.videoID);
      playerInstance.setVolume(this.volume * 100);
      playerInstance.pauseVideo();
    }

    this.stateCheckInterval = setInterval(() => {
      if (playerInstance) {
        const state = playerInstance.getPlayerState();
        if (state === 0) {
          this.onEndedCb?.();
        }
      }
    }, 500);
  }

  async play(): Promise<void> {
    if (playerInstance && this.videoId) {
      playerInstance.playVideo();
    }
  }

  pause(): void {
    playerInstance?.pauseVideo();
  }

  stop(): void {
    playerInstance?.stopVideo();
  }

  seek(time: number): void {
    playerInstance?.seekTo(time, true);
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    playerInstance?.setVolume(this.volume * 100);
  }

  mute(): void {
    playerInstance?.mute();
  }

  unMute(): void {
    playerInstance?.unMute();
  }

  getDuration(): number {
    return playerInstance?.getDuration() ?? 0;
  }

  getCurrentTime(): number {
    return playerInstance?.getCurrentTime() ?? 0;
  }

  getVolume(): number {
    return this.volume;
  }

  onEnded(callback: () => void): void {
    this.onEndedCb = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCb = callback;
  }

  async fadeIn(duration: number, targetVolume?: number): Promise<void> {
    this._fading = true;
    const target = (targetVolume ?? this.volume) * 100;
    const steps = Math.max(1, Math.floor(duration / 50));
    const increment = target / steps;
    for (let i = 1; i <= steps; i++) {
      if (!this._fading) return;
      playerInstance?.setVolume(i * increment);
      await new Promise((r) => setTimeout(r, 50));
    }
    if (this._fading) {
      playerInstance?.setVolume(target);
    }
    this._fading = false;
  }

  async fadeOut(duration: number): Promise<void> {
    this._fading = true;
    const startVol = playerInstance?.getVolume() ?? 0;
    if (startVol <= 0) return;
    const steps = Math.max(1, Math.floor(duration / 50));
    const decrement = startVol / steps;
    for (let i = 1; i <= steps; i++) {
      if (!this._fading) return;
      playerInstance?.setVolume(startVol - i * decrement);
      await new Promise((r) => setTimeout(r, 50));
    }
    if (this._fading) {
      playerInstance?.setVolume(0);
    }
    this._fading = false;
  }

  cancelFade(): void {
    this._fading = false;
  }

  destroy(): void {
    this._fading = false;
    this.cleanup();
    releasePlayer();
  }

  private cleanup(): void {
    if (this.stateCheckInterval) {
      clearInterval(this.stateCheckInterval);
      this.stateCheckInterval = null;
    }
    this.onEndedCb = null;
    this.onErrorCb = null;
  }
}
