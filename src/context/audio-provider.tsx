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

type AudioProviderState = AudioState & {
  setPlaylist: (playlist: Playlist | null) => void;
  setEnabled: (value: boolean) => void;
  toggle: () => void;
  setVolume: (value: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;
};

const AudioContext = createContext<AudioProviderState | undefined>(undefined);

const DEFAULT_TRACK: TrackMetadata = {
  id: "local-default",
  title: "Ambient Silence",
  creator: "PageOS",
  provider: "local",
  license: "CC0",
  duration: 0,
  playbackType: "html",
  streamURL: "",
  sourceURL: "",
  tags: ["ambient"],
  score: 0,
};

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

  const playWithInteractionGate = useCallback(async (engine: PlaybackEngine) => {
    if (!interactionRef.current) {
      const handler = () => {
        interactionRef.current = true;
        document.removeEventListener("click", handler);
        document.removeEventListener("keydown", handler);
        engine.play().catch(() => {});
      };
      document.addEventListener("click", handler);
      document.addEventListener("keydown", handler);
      return;
    }
    await engine.play().catch(() => {});
  }, []);

  const playCurrentEngine = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    playWithInteractionGate(engine);
  }, [playWithInteractionGate]);

  const handleTrackEnd = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    setState((prev) => {
      const playlist = prev.currentPlaylist;
      if (!playlist || playlist.length === 0) return prev;

      const track = pickRandom(playlist, previousTrackIdRef.current, (t) => t.id);
      previousTrackIdRef.current = track.id;

      engine.load(track).then(() => {
        engine.setVolume(musicVolume);
        playWithInteractionGate(engine);
      });

      return { ...prev, currentTrack: track, playing: true };
    });
  }, [musicVolume, playWithInteractionGate]);

  const handleTrackError = useCallback(() => {
    handleTrackEnd();
  }, [handleTrackEnd]);

  const startPlaylist = useCallback(
    (playlist: Playlist, label?: string) => {
      if (playlist.length === 0) return;

      const track = pickRandom(playlist, undefined, (t) => t.id);
      previousTrackIdRef.current = track.id;

      const oldEngine = engineRef.current;
      if (oldEngine) {
        oldEngine.destroy();
      }

      const engine = createEngine(track);
      engineRef.current = engine;
      engine.setVolume(musicVolume);
      engine.onEnded(handleTrackEnd);
      engine.onError(handleTrackError);

      engine.load(track).then(() => {
        setState((prev) => ({
          ...prev,
          currentTrack: track,
          currentPlaylist: playlist,
          playlistLabel: label ?? prev.playlistLabel,
          playing: true,
        }));
        playWithInteractionGate(engine);
      });
    },
    [musicVolume, handleTrackEnd, handleTrackError, playWithInteractionGate],
  );

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    startPlaylist(DEFAULT_PLAYLIST);
  }, [startPlaylist]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setVolume(clamp(musicVolume, 0, 1));
  }, [musicVolume]);

  useEffect(() => {
    setState((prev) => ({ ...prev, volume: musicVolume }));
  }, [musicVolume]);

  useEffect(() => {
    setState((prev) => ({ ...prev, enabled: musicEnabled }));

    const engine = engineRef.current;
    if (!musicEnabled && engine) {
      engine.pause();
      setState((prev) => ({ ...prev, playing: false }));
    }

    if (musicEnabled && engine && state.currentTrack && !state.playing) {
      engine.play().catch(() => {});
      setState((prev) => ({ ...prev, playing: true }));
    }
  }, [musicEnabled, state.currentTrack, state.playing]);

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
    (value: boolean) => {
      setMusicEnabled(value);
    },
    [setMusicEnabled],
  );

  const toggle = useCallback(() => {
    setMusicEnabled(!musicEnabled);
  }, [musicEnabled, setMusicEnabled]);

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

    setState((prev) => {
      const playlist = prev.currentPlaylist;
      if (!playlist || playlist.length === 0) return prev;

      const track = pickRandom(playlist, prev.currentTrack?.id, (t) => t.id);
      previousTrackIdRef.current = track.id;

      engine.load(track).then(() => {
        engine.setVolume(musicVolume);
        if (prev.enabled) {
          playWithInteractionGate(engine);
        }
      });

      return { ...prev, currentTrack: track, playing: prev.enabled };
    });
  }, [musicVolume, playWithInteractionGate]);

  const previousTrack = useCallback(() => {
    nextTrack();
  }, [nextTrack]);

  const value: AudioProviderState = {
    ...state,
    setPlaylist,
    setEnabled,
    toggle,
    setVolume,
    nextTrack,
    previousTrack,
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
