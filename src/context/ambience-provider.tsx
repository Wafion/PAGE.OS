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
import { usePathname } from "next/navigation";
import {
  AmbienceSound,
  AMBIENCE_SOUNDS,
  AMBIENCE_MAP,
} from "@/lib/audio/ambience-manifest";

const FADE_DURATION_MS = 750;
const DEFAULT_VOLUME = 0.25;

interface AmbienceContextValue {
  activeSound: AmbienceSound | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  playAmbience: (soundId: string) => Promise<void>;
  stopAmbience: () => Promise<void>;
  togglePlay: () => Promise<void>;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  availableSounds: AmbienceSound[];
}

const AmbienceContext = createContext<AmbienceContextValue | undefined>(undefined);

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

export function AmbienceProvider({ children }: { children: ReactNode }) {
  const [activeSound, setActiveSound] = useState<AmbienceSound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolumeState] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_VOLUME;
    try {
      const stored = localStorage.getItem("pageos-ambience-volume");
      return stored !== null ? clamp(parseFloat(stored)) : DEFAULT_VOLUME;
    } catch {
      return DEFAULT_VOLUME;
    }
  });

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const fadingAudioRef = useRef<HTMLAudioElement | null>(null);
  const fadeAnimationRef = useRef<number | null>(null);
  const pathname = usePathname();
  const prevPathnameRef = useRef<string | null>(null);
  const targetVolumeRef = useRef<number>(volume);
  targetVolumeRef.current = isMuted ? 0 : volume;

  const cancelFades = useCallback(() => {
    if (fadeAnimationRef.current !== null) {
      cancelAnimationFrame(fadeAnimationRef.current);
      fadeAnimationRef.current = null;
    }
  }, []);

  const fadeOutAndCleanup = useCallback(
    (audio: HTMLAudioElement, durationMs = FADE_DURATION_MS): Promise<void> => {
      return new Promise<void>((resolve) => {
        const startVolume = audio.volume;
        if (startVolume <= 0) {
          audio.pause();
          audio.src = "";
          resolve();
          return;
        }

        const startTime = performance.now();
        const step = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / durationMs, 1);
          const currentVol = clamp(startVolume * (1 - progress));
          audio.volume = currentVol;

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            audio.pause();
            audio.volume = 0;
            audio.src = "";
            resolve();
          }
        };
        requestAnimationFrame(step);
      });
    },
    []
  );

  const fadeInAudio = useCallback(
    (
      audio: HTMLAudioElement,
      targetVol: number,
      durationMs = FADE_DURATION_MS
    ): Promise<void> => {
      return new Promise<void>((resolve) => {
        audio.volume = 0;
        const startTime = performance.now();
        const step = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / durationMs, 1);
          const currentVol = clamp(progress * targetVol);
          audio.volume = currentVol;

          if (progress < 1) {
            fadeAnimationRef.current = requestAnimationFrame(step);
          } else {
            audio.volume = targetVol;
            fadeAnimationRef.current = null;
            resolve();
          }
        };
        fadeAnimationRef.current = requestAnimationFrame(step);
      });
    },
    []
  );

  const stopAmbience = useCallback(async () => {
    cancelFades();
    const currentAudio = activeAudioRef.current;
    if (currentAudio) {
      activeAudioRef.current = null;
      setIsPlaying(false);
      await fadeOutAndCleanup(currentAudio);
    } else {
      setIsPlaying(false);
    }
  }, [cancelFades, fadeOutAndCleanup]);

  const playAmbience = useCallback(
    async (soundId: string) => {
      const sound = AMBIENCE_MAP.get(soundId);
      if (!sound) return;

      cancelFades();

      // If switching from an existing playing sound, fade it out smoothly
      const oldAudio = activeAudioRef.current;
      if (oldAudio) {
        fadingAudioRef.current = oldAudio;
        activeAudioRef.current = null;
        void fadeOutAndCleanup(oldAudio).then(() => {
          if (fadingAudioRef.current === oldAudio) {
            fadingAudioRef.current = null;
          }
        });
      }

      // Create new audio element
      const newAudio = new Audio();
      newAudio.src = sound.src;
      newAudio.loop = sound.loop;
      newAudio.preload = "auto";
      newAudio.volume = 0;

      activeAudioRef.current = newAudio;
      setActiveSound(sound);
      setIsPlaying(true);

      // Persist last selected sound
      try {
        localStorage.setItem("pageos-ambience-id", sound.id);
      } catch (err) {
        console.warn("Could not save ambience preference to localStorage:", err);
      }

      try {
        await newAudio.play();
        const effectiveVolume = targetVolumeRef.current;
        await fadeInAudio(newAudio, effectiveVolume);
      } catch (playError) {
        console.warn("Ambience play was prevented by browser policy:", playError);
        setIsPlaying(false);
      }
    },
    [cancelFades, fadeInAudio, fadeOutAndCleanup]
  );

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      await stopAmbience();
    } else if (activeSound) {
      await playAmbience(activeSound.id);
    } else {
      // Default to Gentle Rain if none selected
      await playAmbience("gentle-rain");
    }
  }, [activeSound, isPlaying, playAmbience, stopAmbience]);

  const setVolume = useCallback(
    (newVolume: number) => {
      const clamped = clamp(newVolume);
      setVolumeState(clamped);
      if (isMuted && clamped > 0) {
        setIsMuted(false);
      }

      try {
        localStorage.setItem("pageos-ambience-volume", JSON.stringify(clamped));
      } catch (err) {
        console.warn("Could not save ambience volume to localStorage:", err);
      }

      if (activeAudioRef.current && !isMuted) {
        activeAudioRef.current.volume = clamped;
      }
    },
    [isMuted]
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (activeAudioRef.current) {
        activeAudioRef.current.volume = next ? 0 : volume;
      }
      return next;
    });
  }, [volume]);

  // Restore last selected sound id from localStorage (without autoplaying)
  useEffect(() => {
    try {
      const storedId = localStorage.getItem("pageos-ambience-id");
      if (storedId && AMBIENCE_MAP.has(storedId)) {
        setActiveSound(AMBIENCE_MAP.get(storedId)!);
      }
    } catch {
      // ignore
    }
  }, []);

  // Ambience is only started from the reader; fade it out when the user
  // leaves the reader so it never overlaps the homepage music.
  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;
    if (prev === pathname) return;

    const leavingReader =
      prev !== null && prev.startsWith("/read") && !pathname.startsWith("/read");
    if (leavingReader && activeAudioRef.current) {
      void stopAmbience();
    }
  }, [pathname, stopAmbience]);

  // Cleanup on provider unmount
  useEffect(() => {
    return () => {
      cancelFades();
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current.src = "";
        activeAudioRef.current = null;
      }
      if (fadingAudioRef.current) {
        fadingAudioRef.current.pause();
        fadingAudioRef.current.src = "";
        fadingAudioRef.current = null;
      }
    };
  }, [cancelFades]);

  const value: AmbienceContextValue = {
    activeSound,
    isPlaying,
    volume,
    isMuted,
    playAmbience,
    stopAmbience,
    togglePlay,
    setVolume,
    toggleMute,
    availableSounds: AMBIENCE_SOUNDS,
  };

  return (
    <AmbienceContext.Provider value={value}>{children}</AmbienceContext.Provider>
  );
}

export function useAmbience(): AmbienceContextValue {
  const context = useContext(AmbienceContext);
  if (!context) {
    throw new Error("useAmbience must be used within an AmbienceProvider");
  }
  return context;
}
