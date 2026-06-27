"use client";

import React, { useState } from "react";
import { Volume2, VolumeX, Music, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAudio } from "@/context/audio-provider";

export function AudioControls() {
  const { enabled, toggle, volume, setVolume, playing, currentTrack } = useAudio();
  const [showVolume, setShowVolume] = useState(false);
  const [showAttribution, setShowAttribution] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <div className="relative">
        <Button
          variant="outline"
          size="icon"
          onClick={toggle}
          aria-label={enabled ? "Mute ambient music" : "Enable ambient music"}
          className="h-8 w-8 border-transparent text-muted-foreground hover:bg-accent/10 hover:text-accent"
          title={enabled ? "Ambient music is on" : "Ambient music is off"}
          onMouseEnter={() => setShowAttribution(true)}
          onMouseLeave={() => setShowAttribution(false)}
        >
          {enabled ? (
            <Music className={`h-3.5 w-3.5 text-accent ${playing ? "opacity-100" : "opacity-70"}`} />
          ) : (
            <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>

        {showAttribution && currentTrack && playing && (
          <div className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-md border border-border/50 bg-background p-2.5 shadow-md">
            <p className="truncate text-xs font-medium text-accent">
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
                className="mt-1 flex items-center gap-1 text-[10px] text-accent/60 hover:text-accent"
              >
                <ExternalLink className="h-2.5 w-2.5" />
                View source
              </a>
            )}
          </div>
        )}
      </div>

      {enabled && (
        <div
          className="relative flex items-center"
          onMouseEnter={() => setShowVolume(true)}
          onMouseLeave={() => setShowVolume(false)}
        >
          <Button
            variant="outline"
            size="icon"
            aria-label={`Volume: ${Math.round(volume * 100)}%`}
            className="h-8 w-8 border-transparent text-muted-foreground hover:bg-accent/10 hover:text-accent"
            onClick={() => setShowVolume(!showVolume)}
          >
            <Volume2 className="h-3.5 w-3.5 text-accent opacity-70" />
          </Button>

          {showVolume && (
            <div className="absolute right-0 top-full z-50 mt-1 w-28 rounded-md border border-border/50 bg-background p-2 shadow-md">
              <Slider
                value={[volume]}
                onValueChange={([v]) => v != null && setVolume(v)}
                min={0}
                max={1}
                step={0.05}
                aria-label="Music volume"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
