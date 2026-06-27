"use client";

import React from "react";
import { ExternalLink } from "lucide-react";
import { useAudio } from "@/context/audio-provider";

export function NowPlayingBar() {
  const { currentTrack, playing, enabled } = useAudio();

  if (!enabled || !playing || !currentTrack) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/30 bg-background/90 px-4 py-1.5 text-[10px] text-muted-foreground backdrop-blur-sm">
      <div className="mx-auto flex max-w-screen-lg items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent/60 animate-pulse" />
          <span className="truncate font-medium text-accent/80">
            {currentTrack.title || "Untitled"}
          </span>
          <span className="shrink-0 truncate opacity-60">
            by {currentTrack.creator || "Unknown"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="opacity-50">{currentTrack.provider}</span>
          <span className="opacity-50">{currentTrack.license}</span>
          {currentTrack.sourceURL && (
            <a
              href={currentTrack.sourceURL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 text-accent/60 hover:text-accent"
              aria-label="Open source"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
