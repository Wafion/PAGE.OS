"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Volume2,
  VolumeX,
  Volume1,
  Music,
  ExternalLink,
  Radio,
  AudioLines,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAudio } from "@/context/audio-provider";
import { cn } from "@/lib/utils";

const KNOWN_ROUTES = new Set([
  "/",
  "/infinite",
  "/library",
  "/profile",
  "/settings",
  "/legal",
  "/legal/dmca",
  "/statistics",
]);

function isUnmatchedRoute(path: string | null): boolean {
  if (!path) return false;
  if (KNOWN_ROUTES.has(path)) return false;
  if (path.startsWith("/read")) return false;
  if (path.startsWith("/infinite")) return false;
  if (path.startsWith("/api/")) return false;
  return true;
}

const SEGMENT_COUNT = 14;
const WHEEL_STEP = 0.05;

const PRESETS = [
  { label: "whisper", value: 0.15 },
  { label: "hush", value: 0.35 },
  { label: "flow", value: 0.55 },
  { label: "pulse", value: 0.8 },
] as const;

export function AudioControls() {
  const pathname = usePathname();
  const { enabled, toggle, volume, setVolume, playing, currentTrack } = useAudio();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);
  const [showAttribution, setShowAttribution] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const [isNotFound, setIsNotFound] = useState(() => {
    if (isUnmatchedRoute(pathname)) return true;
    if (typeof document !== "undefined") {
      return (
        document.body.dataset.pageosNotFound === "true" ||
        Boolean(document.querySelector(".pageos-not-found"))
      );
    }
    return false;
  });

  useEffect(() => {
    const checkNotFound = () => {
      const notFound =
        isUnmatchedRoute(pathname) ||
        document.body.dataset.pageosNotFound === "true" ||
        Boolean(document.querySelector(".pageos-not-found"));
      setIsNotFound(notFound);
    };
    checkNotFound();
    const observer = new MutationObserver(checkNotFound);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-pageos-not-found"],
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [pathname]);

  // Mirror latest values so native (non-passive) listeners never go stale.
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const setVolumeRef = useRef(setVolume);
  setVolumeRef.current = setVolume;
  // Last committed non-zero volume, so unmute restores what mute silenced
  // instead of snapping to an arbitrary default.
  const lastNonZeroVolumeRef = useRef(0.5);
  if (volume > 0) {
    lastNonZeroVolumeRef.current = volume;
  }

  const commitVolume = useCallback((value: number) => {
    setVolumeRef.current(Math.min(1, Math.max(0, value)));
  }, []);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Scrolling anywhere on the console trims the level. Native listener with
  // passive: false so preventDefault actually stops the page from scrolling.
  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      commitVolume(volumeRef.current + (event.deltaY < 0 ? WHEEL_STEP : -WHEEL_STEP));
    };
    panel.addEventListener("wheel", onWheel, { passive: false });
    return () => panel.removeEventListener("wheel", onWheel);
  }, [open, commitVolume]);

  const handleSegmentPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, index: number) => {
      event.preventDefault();
      draggingRef.current = true;
      commitVolume((index + 1) / SEGMENT_COUNT);

      // Capture the pointer on the segment so every move/release lands here
      // even outside the window; pointercancel + blur guarantee the drag
      // state can never wedge (which would silently kill hover preview).
      const segmentEl = event.currentTarget;
      const container = segmentEl.parentElement;
      try {
        segmentEl.setPointerCapture(event.pointerId);
      } catch {
        // Pointer already gone — nothing to track.
      }

      const onMove = (moveEvent: PointerEvent) => {
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const ratio = (moveEvent.clientX - rect.left) / rect.width;
        const segments = Math.max(
          0,
          Math.min(SEGMENT_COUNT, Math.ceil(ratio * SEGMENT_COUNT)),
        );
        commitVolume(segments / SEGMENT_COUNT);
      };
      const endDrag = () => {
        draggingRef.current = false;
        segmentEl.removeEventListener("pointermove", onMove);
        segmentEl.removeEventListener("pointerup", onUp);
        segmentEl.removeEventListener("pointercancel", onUp);
        window.removeEventListener("blur", onUp);
      };
      const onUp = () => endDrag();
      segmentEl.addEventListener("pointermove", onMove);
      segmentEl.addEventListener("pointerup", onUp);
      segmentEl.addEventListener("pointercancel", onUp);
      window.addEventListener("blur", onUp);
    },
    [commitVolume],
  );

  const handleSegmentPointerEnter = useCallback((index: number) => {
    if (draggingRef.current) return;
    setPreview((index + 1) / SEGMENT_COUNT);
  }, []);

  const handleSegmentsPointerLeave = useCallback(() => {
    setPreview(null);
  }, []);

  const shownVolume = preview ?? volume;
  const activeSegments = Math.round(shownVolume * SEGMENT_COUNT);
  const percent = Math.round(shownVolume * 100);
  const isMuted = volume === 0;

  // Must stay below every hook: returning earlier would run fewer hooks on
  // 404 renders than on normal renders (React error #310).
  if (isNotFound) {
    return null;
  }

  return (
    <div className="flex items-center gap-1" ref={rootRef}>
      {/* Music enable/disable + now-playing attribution */}
      <div
        className="relative"
        onMouseEnter={() => setShowAttribution(true)}
        onMouseLeave={() => setShowAttribution(false)}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={enabled ? "Mute ambient music" : "Enable ambient music"}
          className="h-8 w-8 border-transparent text-muted-foreground hover:bg-[#6c55db]/10 hover:text-[#6c55db]"
          title={enabled ? "Ambient music is on" : "Ambient music is off"}
        >
          {enabled ? (
            <Music
              className={cn(
                "h-3.5 w-3.5 text-[#6c55db]",
                playing ? "opacity-100" : "opacity-70",
              )}
            />
          ) : (
            <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>

        {showAttribution && currentTrack && playing && (
          <div className="absolute top-full right-0 z-50 mt-2 w-56 rounded-md border border-border/50 bg-background p-2.5 shadow-md">
            <p className="truncate text-xs font-medium text-[#6c55db]">
              {currentTrack.title || "Untitled"}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
              by {currentTrack.creator || "Unknown"}
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
              <span>{currentTrack.provider}</span>
              <span>·</span>
              <span>{currentTrack.license}</span>
            </div>
            {currentTrack.sourceURL && (
              <a
                href={currentTrack.sourceURL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center gap-1 text-[10px] text-[#6c55db]/60 hover:text-[#6c55db]"
              >
                <ExternalLink className="h-2.5 w-2.5" />
                View source
              </a>
            )}
          </div>
        )}
      </div>

      {/* PageOS audio console */}
      {enabled && (
        <div className="relative flex items-center">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Audio console — level ${Math.round(volume * 100)}%`}
            aria-expanded={open}
            className={cn(
              "h-8 w-8 border-transparent text-muted-foreground hover:bg-[#6c55db]/10 hover:text-[#6c55db]",
              open && "bg-[#6c55db]/10 text-[#6c55db]",
            )}
            onClick={() => {
              // Discard any uncommitted hover preview so a stale preview can
              // never survive a close/reopen of the console.
              setPreview(null);
              setOpen((prev) => !prev);
            }}
          >
            {isMuted ? (
              <VolumeX className="h-3.5 w-3.5 text-destructive" />
            ) : volume < 0.5 ? (
              <Volume1 className="h-3.5 w-3.5 text-[#6c55db] opacity-70" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-[#6c55db] opacity-70" />
            )}
          </Button>

          {open && (
            <div
              ref={panelRef}
              className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-border/60 bg-background/95 p-3 shadow-xl backdrop-blur-md"
            >
              <div className="pointer-events-none absolute inset-x-2 top-1 h-px bg-gradient-to-r from-transparent via-[#6c55db]/40 to-transparent" />

              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Radio className="h-3 w-3 text-[#6c55db]" />
                  <span className="font-sans font-medium text-[10px] uppercase tracking-[0.2em] text-[#6c55db]">
                    audio console
                  </span>
                </div>
                <span
                  className={cn(
                    "font-sans font-medium text-[10px] uppercase tracking-[0.15em]",
                    playing ? "text-[#6c55db]/80" : "text-muted-foreground",
                  )}
                >
                  {playing ? "● live" : "○ paused"}
                </span>
              </div>

              {/* LED segment level meter — click, drag, scroll, or arrow keys */}
              <div
                data-segments-container
                className="flex h-6 touch-none items-end gap-[3px] px-0.5 py-1"
                onPointerLeave={handleSegmentsPointerLeave}
                role="slider"
                tabIndex={0}
                aria-label="Music volume"
                aria-orientation="horizontal"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                    event.preventDefault();
                    commitVolume(volumeRef.current + WHEEL_STEP);
                  } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                    event.preventDefault();
                    commitVolume(volumeRef.current - WHEEL_STEP);
                  } else if (event.key === "Home") {
                    event.preventDefault();
                    commitVolume(0);
                  } else if (event.key === "End") {
                    event.preventDefault();
                    commitVolume(1);
                  }
                }}
              >
                {Array.from({ length: SEGMENT_COUNT }, (_, i) => {
                  const active = i < activeSegments;
                  const hot = (i + 1) / SEGMENT_COUNT >= 0.8;
                  return (
                    <div
                      key={i}
                      role="presentation"
                      className="group relative h-full flex-1 cursor-pointer"
                      onPointerDown={(e) => handleSegmentPointerDown(e, i)}
                      onPointerEnter={() => handleSegmentPointerEnter(i)}
                    >
                      <div
                        className={cn(
                          "h-full w-full rounded-[1px] transition-colors duration-150",
                          active
                            ? hot
                              ? "bg-[#6c55db] shadow-[0_0_5px_rgba(108,85,219,0.55)]"
                              : "bg-[#6c55db]/80"
                            : "bg-muted-foreground/20 group-hover:bg-muted-foreground/30",
                        )}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mb-2 flex items-center justify-between">
                <span className="font-sans font-medium text-[11px] tabular-nums tracking-wider text-foreground">
                  {percent}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 gap-1 rounded-full px-2 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-[#6c55db]/10 hover:text-[#6c55db]"
                  onClick={() =>
                    commitVolume(
                      isMuted
                        ? Math.max(lastNonZeroVolumeRef.current, 0.05)
                        : 0,
                    )
                  }
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <Volume2 className="h-2.5 w-2.5" />
                  ) : (
                    <VolumeX className="h-2.5 w-2.5" />
                  )}
                  {isMuted ? "unmute" : "mute"}
                </Button>
              </div>

              <div className="mb-2.5 h-px bg-border/50" />

              <div className="flex gap-1">
                {PRESETS.map((preset) => {
                  const isActive = Math.abs(volume - preset.value) < 0.026;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => commitVolume(preset.value)}
                      className={cn(
                        "flex-1 rounded-full border px-0 py-1 text-[9px] uppercase tracking-wider transition-colors",
                        isActive
                          ? "border-[#6c55db]/60 bg-[#6c55db]/10 text-[#6c55db]"
                          : "border-border/60 text-muted-foreground hover:border-[#6c55db]/40 hover:text-[#6c55db]",
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Now playing strip */}
              <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-2 py-1.5">
                <AudioLines className="h-3 w-3 shrink-0 text-[#6c55db]" />
                <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">
                  {playing && currentTrack
                    ? currentTrack.title || "Untitled"
                    : "silence — nothing in rotation"}
                </span>
                {playing && !isMuted && (
                  <div className="flex h-3 items-end gap-[2px]" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="eq-bar w-[2px] rounded-full bg-[#6c55db]"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <p className="mt-2 text-center text-[9px] uppercase tracking-[0.15em] text-muted-foreground/50">
                scroll · drag · presets
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}




