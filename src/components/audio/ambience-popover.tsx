"use client";

import React, { useState } from "react";
import {
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  Trees,
  Moon,
  Waves,
  Droplets,
  Flame,
  Sparkles,
  Coffee,
  BookOpen,
  Train,
  Disc,
  Radio,
  Volume2,
  VolumeX,
  Power,
  Headphones,
  Info,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAmbience } from "@/context/ambience-provider";
import {
  AMBIENCE_CATEGORIES,
  AmbienceCategory,
  AmbienceSound,
} from "@/lib/audio/ambience-manifest";

const ICON_MAP: Record<string, React.ElementType> = {
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  Trees,
  Moon,
  Waves,
  Droplets,
  Flame,
  Sparkles,
  Coffee,
  BookOpen,
  TrainTrack: Train,
  Train,
  Disc,
  Radio,
};

function SoundIcon({ name, className }: { name: string; className?: string }) {
  const IconComponent = ICON_MAP[name] || Headphones;
  return <IconComponent className={className || "h-3.5 w-3.5"} />;
}

export function AmbiencePopover({ className }: { className?: string }) {
  const {
    activeSound,
    isPlaying,
    volume,
    isMuted,
    playAmbience,
    stopAmbience,
    setVolume,
    toggleMute,
    availableSounds,
  } = useAmbience();

  const [isOpen, setIsOpen] = useState(false);
  const [showCredits, setShowCredits] = useState(false);

  const soundsByCategory = AMBIENCE_CATEGORIES.map((cat) => ({
    ...cat,
    sounds: availableSounds.filter((s) => s.category === cat.id),
  }));

  const handleSelectSound = async (sound: AmbienceSound) => {
    if (activeSound?.id === sound.id && isPlaying) {
      await stopAmbience();
    } else {
      await playAmbience(sound.id);
    }
  };

  const activeLabel = isPlaying && activeSound ? activeSound.name : "Ambience";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={`Reading Ambience: ${isPlaying && activeSound ? activeSound.name : "Off"}`}
          className={`h-8 gap-1.5 border-border/50 text-xs transition-colors ${
            isPlaying
              ? "border-accent/60 bg-accent/15 text-accent shadow-[0_0_12px_rgba(0,255,200,0.15)]"
              : "text-muted-foreground hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
          } ${className || ""}`}
          title={isPlaying && activeSound ? `Ambience: ${activeSound.name}` : "Acoustic reading environment"}
        >
          {isPlaying && activeSound ? (
            <SoundIcon name={activeSound.iconName} className="h-3.5 w-3.5 text-accent animate-pulse" />
          ) : (
            <Headphones className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline-block max-w-[110px] truncate">{activeLabel}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 border-border/60 bg-background/95 p-0 shadow-2xl backdrop-blur-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <Headphones className="h-4 w-4 text-accent" />
            <div>
              <p className="font-headline text-[11px] uppercase tracking-[0.2em] text-accent">
                Reading Environment
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isPlaying && activeSound ? activeSound.name : "Silence (Off)"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isPlaying && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void stopAmbience()}
                className="h-7 px-2 text-[10px] uppercase tracking-wider text-destructive hover:bg-destructive/10 hover:text-destructive"
                title="Turn off ambience"
              >
                <Power className="mr-1 h-3 w-3" />
                Mute
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCredits(!showCredits)}
              aria-label="Licensing and attribution details"
              className={`h-7 w-7 text-muted-foreground hover:text-foreground ${showCredits ? "text-accent bg-accent/10" : ""}`}
              title="License details"
            >
              <Info className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Credits View */}
        {showCredits ? (
          <div className="max-h-[340px] overflow-y-auto p-3.5 text-xs text-muted-foreground space-y-3">
            <div className="border border-accent/20 bg-accent/5 p-2.5 rounded">
              <p className="font-medium text-foreground text-[11px]">Public Domain & CC0 Audio</p>
              <p className="mt-1 text-[10px] leading-relaxed">
                All PAGE.OS ambience recordings are sourced under Creative Commons 0 (CC0 1.0 Universal) public domain dedications and custom DSP synthesis.
              </p>
            </div>

            <div className="space-y-2 text-[10px]">
              {availableSounds.map((sound) => (
                <div key={sound.id} className="border-b border-border/30 pb-1.5 flex justify-between items-start">
                  <div>
                    <span className="font-medium text-foreground">{sound.name}</span>
                    <p className="text-muted-foreground/70">{sound.creator} · {sound.source}</p>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-accent/80 font-mono">CC0</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Soundscape Selector */
          <div className="max-h-[350px] overflow-y-auto p-2.5 space-y-3">
            {soundsByCategory.map((category) => (
              <div key={category.id} className="space-y-1">
                <div className="px-2 py-0.5 font-headline text-[9px] uppercase tracking-[0.24em] text-muted-foreground/80">
                  {category.label}
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {category.sounds.map((sound) => {
                    const isSelected = activeSound?.id === sound.id && isPlaying;
                    return (
                      <button
                        key={sound.id}
                        type="button"
                        onClick={() => void handleSelectSound(sound)}
                        className={`group flex items-center justify-between rounded px-2.5 py-1.5 text-left text-xs transition-all ${
                          isSelected
                            ? "bg-accent/15 text-accent font-medium border border-accent/40 shadow-sm"
                            : "text-foreground/90 hover:bg-accent/5 hover:text-foreground border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${
                              isSelected ? "bg-accent/20 text-accent" : "bg-muted/40 text-muted-foreground group-hover:text-foreground"
                            }`}
                          >
                            <SoundIcon name={sound.iconName} className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[12px]">{sound.name}</p>
                            <p className="truncate text-[10px] text-muted-foreground/80 group-hover:text-muted-foreground">
                              {sound.description}
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-1.5 shrink-0 pl-2">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
                            <Check className="h-3.5 w-3.5 text-accent" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Volume & Master Controls Footer */}
        <div className="border-t border-border/50 bg-card/40 px-3.5 py-2.5">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              aria-label={isMuted ? "Unmute ambience" : "Mute ambience"}
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-3.5 w-3.5 text-destructive" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-accent" />
              )}
            </Button>

            <div className="flex-1">
              <Slider
                value={[isMuted ? 0 : volume]}
                onValueChange={([v]) => {
                  if (v !== undefined) setVolume(v);
                }}
                min={0}
                max={1}
                step={0.01}
                aria-label="Ambience volume"
                className="cursor-pointer"
              />
            </div>

            <span className="w-9 text-right font-mono text-[10px] text-muted-foreground">
              {isMuted ? "0%" : `${Math.round(volume * 100)}%`}
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
