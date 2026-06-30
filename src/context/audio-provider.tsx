"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import type { Playlist, AudioState, TrackMetadata } from "@/lib/audio/types";
import { DEFAULT_PLAYLIST } from "@/lib/audio/playlists";
import { pickRandom, clamp } from "@/lib/audio/utils";
import type { PlaybackEngine } from "@/lib/audio/playback-types";
import { HTMLAudioPlaybackEngine } from "@/lib/audio/engines/html-audio-engine";
import { YouTubePlaybackEngine } from "@/lib/audio/engines/youtube-engine";
import { useReaderSettings } from "@/context/reader-settings-provider";

const FADE_MS = 800;
const FADE_INITIAL_MS = 3000;
const FADE_SUSPEND = 2000;

type AudioProviderState = AudioState & {
  setPlaylist: (playlist: Playlist | null) => void;
  setEnabled: (value: boolean) => void;
  toggle: () => void;
  setVolume: (value: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  suspendMusic: () => Promise<void>;
  resumeMusic: () => Promise<void>;
};

const AudioContext = createContext<AudioProviderState | undefined>(undefined);

function buildInitialState(): AudioState {
  return {
    enabled: true,
    volume: 0.5,
    playing: false,
    currentTrack: null,
    currentPlaylist: [],
    playlistLabel: "ambient",
  };
}

function createEngine(track: TrackMetadata): PlaybackEngine {
  if (track.playbackType === "youtube") {
    return new YouTubePlaybackEngine();
  }
  return new HTMLAudioPlaybackEngine();
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const { musicEnabled, setMusicEnabled, musicVolume, setMusicVolume } =
    useReaderSettings();

  const [state, setState] = useState<AudioState>(buildInitialState);
  const engineRef = useRef<PlaybackEngine | null>(null);
  const interactionRef = useRef(false);
  const previousTrackIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const positionCacheRef = useRef<Map<string, number>>(new Map());
  const stateRef = useRef(state);
  stateRef.current = state;
  const musicEnabledRef = useRef(musicEnabled);
  musicEnabledRef.current = musicEnabled;
  const transitioningRef = useRef(false);
  const pendingVolumeRef = useRef<number | null>(null);
  const suspendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playWithInteractionGate = useCallback(
    async (engine: PlaybackEngine): Promise<void> => {
      if (!musicEnabledRef.current) {
        return;
      }

      if (!interactionRef.current) {
        return new Promise<void>((resolve) => {
          const handler = () => {
            interactionRef.current = true;
            document.removeEventListener("click", handler);
            document.removeEventListener("keydown", handler);
            if (!musicEnabledRef.current) {
              resolve();
              return;
            }
            engine.play().catch(() => {}).then(() => resolve(), () => resolve());
          };
          document.addEventListener("click", handler);
          document.addEventListener("keydown", handler);
        });
      }
      await engine.play().catch(() => {});
    },
    [],
  );

  const playCurrentEngine = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    playWithInteractionGate(engine);
  }, [playWithInteractionGate]);

  const fadeInAndPlay = useCallback(
    async (engine: PlaybackEngine, targetVolume: number) => {
      engine.setVolume(0);
      await playWithInteractionGate(engine);
      await engine.fadeIn(FADE_MS, targetVolume);
    },
    [playWithInteractionGate],
  );

  const handleTrackEnd = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const cs = stateRef.current;
    const playlist = cs.currentPlaylist;
    if (!playlist || playlist.length === 0) return;

    const track = pickRandom(playlist, previousTrackIdRef.current, (t) => t.id);
    previousTrackIdRef.current = track.id;

    setState((prev) => ({
      ...prev,
      currentTrack: track,
      playing: true,
    }));

    engine.load(track).then(() => {
      fadeInAndPlay(engine, musicVolume);
    });
  }, [musicVolume, fadeInAndPlay]);

  const handleTrackError = useCallback(() => {
    handleTrackEnd();
  }, [handleTrackEnd]);

  const startPlaylist = useCallback(
    async (playlist: Playlist, label?: string) => {
      if (playlist.length === 0) return;
      transitioningRef.current = true;

      try {
        const oldEngine = engineRef.current;
        const cs = stateRef.current;

        // Save position before switching away
        if (oldEngine && cs.currentTrack) {
          positionCacheRef.current.set(cs.currentTrack.id, oldEngine.getCurrentTime());
          await oldEngine.fadeOut(FADE_MS);
          oldEngine.destroy();
        }

        const effectiveLabel = label ?? "default";

        // Pick track: prefer one with a cached position
        let track: TrackMetadata | null = null;
        let cachedPosition: number | undefined;

        for (const t of playlist) {
          const pos = positionCacheRef.current.get(t.id);
          if (pos !== undefined) {
            track = t;
            cachedPosition = pos;
            positionCacheRef.current.delete(t.id);
            break;
          }
        }

        if (!track) {
          track = pickRandom(playlist, undefined, (t) => t.id);
        }

        previousTrackIdRef.current = track.id;

        const engine = createEngine(track);
        engineRef.current = engine;
        engine.setVolume(musicVolume);
        engine.onEnded(handleTrackEnd);
        engine.onError(handleTrackError);

        // Set audio directly to 0, not via setVolume (to preserve _targetVolume)
        engine.setVolume(0);
        await engine.load(track);

        const isFirstPlay = cachedPosition === undefined;

        // First play this session: seek to a random position
        if (isFirstPlay) {
          const duration = engine.getDuration();
          if (duration > 5) {
            const margin = Math.min(5, duration * 0.1);
            engine.seek(Math.random() * (duration - margin));
          }
        } else if (cachedPosition !== undefined && cachedPosition > 0) {
          engine.seek(cachedPosition);
        }

        setState((prev) => ({
          ...prev,
          currentTrack: track,
          currentPlaylist: playlist,
          playlistLabel: effectiveLabel,
          playing: musicEnabledRef.current,
        }));

        if (!musicEnabledRef.current) {
          return;
        }

        await playWithInteractionGate(engine);
        engine.fadeIn(isFirstPlay ? FADE_INITIAL_MS : FADE_MS, musicVolume);
      } finally {
        transitioningRef.current = false;
        const pending = pendingVolumeRef.current;
        if (pending !== null) {
          pendingVolumeRef.current = null;
          const eng = engineRef.current;
          if (eng) eng.setVolume(clamp(pending, 0, 1));
        }
      }
    },
    [musicVolume, handleTrackEnd, handleTrackError, playWithInteractionGate],
  );

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    startPlaylist(DEFAULT_PLAYLIST);
  }, [startPlaylist]);

  useEffect(() => {
    if (transitioningRef.current) {
      pendingVolumeRef.current = musicVolume;
      return;
    }
    const engine = engineRef.current;
    if (!engine) return;
    engine.setVolume(clamp(musicVolume, 0, 1));
  }, [musicVolume]);

  useEffect(() => {
    setState((prev) => ({ ...prev, volume: musicVolume }));
  }, [musicVolume]);

  useEffect(() => {
    setState((prev) => ({ ...prev, enabled: musicEnabled }));

    if (transitioningRef.current) return;

    const engine = engineRef.current;
    if (!musicEnabled && engine) {
      engine.fadeOut(FADE_MS).then(() => {
        engine.pause();
      });
      setState((prev) => ({ ...prev, playing: false }));
    }
  }, [musicEnabled]);

  const setPlaylist = useCallback(
    (playlist: Playlist | null) => {
      if (!playlist || playlist.length === 0) {
        startPlaylist(DEFAULT_PLAYLIST, "ambient");
        return;
      }
      startPlaylist(playlist);
    },
    [startPlaylist],
  );

  const setEnabled = useCallback(
    async (value: boolean) => {
      const engine = engineRef.current;
      if (!value && engine) {
        await engine.fadeOut(FADE_MS);
        engine.pause();
      }
      setMusicEnabled(value);
      if (value && engine && stateRef.current.currentTrack) {
        engine.setVolume(0);
        await engine.play().catch(() => {});
        engine.fadeIn(FADE_MS, musicVolume);
      }
    },
    [musicVolume, setMusicEnabled],
  );

  const toggle = useCallback(async () => {
    await setEnabled(!musicEnabled);
  }, [musicEnabled, setEnabled]);

  const setVolume = useCallback(
    (value: number) => {
      const clamped = clamp(value, 0, 1);
      setMusicVolume(clamped);
    },
    [setMusicVolume],
  );

  const nextTrack = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const cs = stateRef.current;
    if (cs.currentTrack) {
      positionCacheRef.current.set(cs.currentTrack.id, engine.getCurrentTime());
    }

    const playlist = cs.currentPlaylist;
    if (!playlist || playlist.length === 0) return;

    engine.fadeOut(FADE_MS).then(() => {
      const track = pickRandom(playlist, cs.currentTrack?.id, (t) => t.id);
      previousTrackIdRef.current = track.id;

      setState((prev) => ({
        ...prev,
        currentTrack: track,
        playing: prev.enabled,
      }));

      engine.setVolume(0);
      engine.load(track).then(() => {
        if (cs.enabled) {
          fadeInAndPlay(engine, musicVolume);
        }
      });
    });
  }, [musicVolume, fadeInAndPlay]);

  const previousTrack = useCallback(() => {
    nextTrack();
  }, [nextTrack]);

  const suspendMusic = useCallback(async () => {
    const engine = engineRef.current;
    if (engine) {
      engine.cancelFade();
      if (suspendTimerRef.current !== null) {
        clearInterval(suspendTimerRef.current);
        suspendTimerRef.current = null;
      }
      const startVol = engine.getVolume();
      if (startVol > 0) {
        const steps = 60;
        const intervalMs = FADE_SUSPEND / steps;
        const decrement = startVol / steps;
        await new Promise<void>((resolve) => {
          let i = 0;
          suspendTimerRef.current = setInterval(() => {
            if (engineRef.current !== engine) {
              clearInterval(suspendTimerRef.current!);
              suspendTimerRef.current = null;
              resolve();
              return;
            }
            i++;
            engine.setVolume(Math.max(0, startVol - i * decrement));
            if (i >= steps) {
              clearInterval(suspendTimerRef.current!);
              suspendTimerRef.current = null;
              engine.pause();
              resolve();
            }
          }, intervalMs);
        });
      } else {
        engine.pause();
      }
    }
    setState((prev) => ({ ...prev, playing: false }));
  }, []);

  const resumeMusic = useCallback(async () => {
    if (suspendTimerRef.current !== null) {
      clearInterval(suspendTimerRef.current);
      suspendTimerRef.current = null;
    }
    const engine = engineRef.current;
    if (engine && stateRef.current.currentTrack && musicEnabled) {
      engine.cancelFade();
      engine.setVolume(0);
      await engine.play().catch(() => {});
      engine.fadeIn(FADE_MS, musicVolume);
      setState((prev) => ({ ...prev, playing: true }));
    }
  }, [musicEnabled, musicVolume]);

  const value: AudioProviderState = {
    ...state,
    setPlaylist,
    setEnabled,
    toggle,
    setVolume,
    nextTrack,
    previousTrack,
    suspendMusic,
    resumeMusic,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
};
