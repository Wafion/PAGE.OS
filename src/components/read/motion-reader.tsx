"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  Type,
  Moon,
  Sun,
  MoreHorizontal,
  Bookmark,
  Share2,
  BookOpen,
  Info,
  Maximize,
  Minimize,
  X,
  Plus,
  Trash2,
  Check,
  PanelLeftClose,
  PanelLeft,
  Headphones,
  Volume2,
  VolumeX,
  Power,
  Flame,
  CloudRain,
  CloudLightning,
  Trees,
  Waves,
  Coffee,
  Disc,
  Radio,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAmbience } from "@/context/ambience-provider";
import {
  AMBIENCE_CATEGORIES,
  type AmbienceCategory,
  type AmbienceSound,
} from "@/lib/audio/ambience-manifest";
import type { SearchResult } from "@/adapters/sourceManager";
import type { TOCEntry, ReaderSector } from "@/hooks/useBookLoader";

const AMBIENCE_ICONS: Record<string, React.ElementType> = {
  CloudRain,
  CloudDrizzle: CloudRain,
  CloudLightning,
  Trees,
  Moon,
  Waves,
  Droplets: CloudRain,
  Flame,
  Sparkles,
  Coffee,
  BookOpen,
  TrainTrack: Disc,
  Train: Disc,
  Disc,
  Radio,
};

function AmbienceSoundIcon({ name, className }: { name: string; className?: string }) {
  const IconComponent = AMBIENCE_ICONS[name] || Headphones;
  return <IconComponent className={className || "w-4 h-4"} />;
}

// Helper to convert integer to Roman numeral
function toRoman(num: number): string {
  if (num <= 0) return String(num);
  const romanMap: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]
  ];
  let result = "";
  for (const [val, sym] of romanMap) {
    while (num >= val) {
      result += sym;
      num -= val;
    }
  }
  return result;
}

export type MotionReaderTheme = "parchment" | "sepia" | "night";

export interface MotionReaderProps {
  book: SearchResult | null;
  toc: TOCEntry[];
  sectors: ReaderSector[];
  currentSector: ReaderSector | undefined;
  activeSector: number;
  setActiveSector: (index: number) => void;
  paginate: (delta: number) => void;
  direction: number;
  setDirection: (dir: number) => void;
  completion: number;
  isBookmarked: boolean;
  isBookmarkLoading: boolean;
  toggleBookmark: () => void;
  onBack?: () => void;
  onShowBriefing?: () => void;
}

export function MotionReader({
  book,
  toc,
  sectors,
  currentSector,
  activeSector,
  setActiveSector,
  paginate,
  direction,
  setDirection,
  completion,
  isBookmarked,
  isBookmarkLoading,
  toggleBookmark,
  onBack,
  onShowBriefing,
}: MotionReaderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const readingViewportRef = useRef<HTMLDivElement>(null);

  // Appearance & Personalization Settings
  const [theme, setTheme] = useState<MotionReaderTheme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("pageos-motion-reader-theme");
      if (stored === "sepia" || stored === "night" || stored === "parchment") return stored;
    }
    return "parchment";
  });

  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg" | "xl">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("pageos-motion-font-size");
      if (stored === "sm" || stored === "base" || stored === "lg" || stored === "xl") return stored;
    }
    return "base";
  });

  const [fontFamily, setFontFamily] = useState<"serif" | "sans" | "mono">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("pageos-motion-font-family");
      if (stored === "serif" || stored === "sans" || stored === "mono") return stored;
    }
    return "serif";
  });

  const [measureWidth, setMeasureWidth] = useState<"normal" | "wide">("normal");

  // Sidebar Tab state
  const [activeTab, setActiveTab] = useState<"contents" | "bookmarks" | "notes">("contents");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // In-book search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [bookSearchQuery, setBookSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Notes state
  const [notes, setNotes] = useState<{ id: string; sectorIndex: number; text: string; date: string }[]>(() => {
    if (typeof window !== "undefined" && book?.id) {
      try {
        const stored = localStorage.getItem(`pageos-notes-${book.id}`);
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.warn("Could not read notes from localStorage", e);
      }
    }
    return [];
  });
  const [newNoteText, setNewNoteText] = useState("");

  // Persist theme changes
  const handleSetTheme = (newTheme: MotionReaderTheme) => {
    setTheme(newTheme);
    try {
      localStorage.setItem("pageos-motion-reader-theme", newTheme);
    } catch (e) {
      console.warn("Could not store theme", e);
    }
  };

  const handleSetFontSize = (size: "sm" | "base" | "lg" | "xl") => {
    setFontSize(size);
    try {
      localStorage.setItem("pageos-motion-font-size", size);
    } catch (e) {
      console.warn("Could not store font size", e);
    }
  };

  const handleSetFontFamily = (family: "serif" | "sans" | "mono") => {
    setFontFamily(family);
    try {
      localStorage.setItem("pageos-motion-font-family", family);
    } catch (e) {
      console.warn("Could not store font family", e);
    }
  };

  // Scroll reading viewport to top on sector change
  useEffect(() => {
    readingViewportRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [activeSector]);

  // Save notes to localStorage
  const handleAddNote = () => {
    if (!newNoteText.trim() || !book?.id) return;
    const newNote = {
      id: String(Date.now()),
      sectorIndex: activeSector,
      text: newNoteText.trim(),
      date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    setNewNoteText("");
    try {
      localStorage.setItem(`pageos-notes-${book.id}`, JSON.stringify(updated));
      toast({ title: "Note Saved", description: `Added note for chapter ${currentChapterNumber}.` });
    } catch (e) {
      console.warn("Could not save note", e);
    }
  };

  const handleDeleteNote = (noteId: string) => {
    if (!book?.id) return;
    const updated = notes.filter((n) => n.id !== noteId);
    setNotes(updated);
    try {
      localStorage.setItem(`pageos-notes-${book.id}`, JSON.stringify(updated));
    } catch (e) {
      console.warn("Could not delete note", e);
    }
  };

  // Search within book matches
  const searchResults = useMemo(() => {
    if (!bookSearchQuery.trim() || bookSearchQuery.length < 2) return [];
    const q = bookSearchQuery.toLowerCase();
    const results: { sectorIndex: number; title: string; snippet: string }[] = [];
    
    sectors.forEach((sec, idx) => {
      const fullText = (sec.paragraphs || []).join(" ");
      const matchIndex = fullText.toLowerCase().indexOf(q);
      if (matchIndex !== -1) {
        const start = Math.max(0, matchIndex - 40);
        const end = Math.min(fullText.length, matchIndex + q.length + 60);
        const snippet = (start > 0 ? "…" : "") + fullText.slice(start, end).replace(/\s+/g, " ") + (end < fullText.length ? "…" : "");
        results.push({
          sectorIndex: idx,
          title: sec.chapterTitle || `Sector ${idx + 1}`,
          snippet,
        });
      }
    });

    return results.slice(0, 30);
  }, [bookSearchQuery, sectors]);

  // Ambience Audio Player hook & state
  const {
    activeSound,
    isPlaying: isAmbiencePlaying,
    volume: ambienceVolume,
    isMuted: isAmbienceMuted,
    playAmbience,
    stopAmbience,
    setVolume: setAmbienceVolume,
    availableSounds,
  } = useAmbience();
  const [isAmbienceOpen, setIsAmbienceOpen] = useState(false);
  const [ambienceCategory, setAmbienceCategory] = useState<"all" | AmbienceCategory>("all");

  const filteredAmbienceSounds = useMemo(() => {
    if (ambienceCategory === "all") return availableSounds;
    return availableSounds.filter((s) => s.category === ambienceCategory);
  }, [availableSounds, ambienceCategory]);

  const handleToggleSound = async (sound: AmbienceSound) => {
    if (activeSound?.id === sound.id && isAmbiencePlaying) {
      await stopAmbience();
    } else {
      await playAmbience(sound.id);
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Share book
  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link Copied",
        description: "Direct reader link copied to clipboard.",
      });
    }).catch(() => {
      toast({ title: "Reader Link", description: url });
    });
  };

  // Chapter metadata
  const currentChapterIndex = currentSector?.chapterIndex ?? 0;
  const currentChapterNumber = currentChapterIndex + 1;
  const chapterEyebrow = `CHAPTER ${toRoman(currentChapterNumber)}`;
  const displayChapterTitle = currentSector?.chapterTitle || (currentChapterNumber === 1 ? "The Introduction" : `Chapter ${currentChapterNumber}`);

  // Cover image URL
  const coverUrl = book?.source === "gutendex"
    ? `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.cover.medium.jpg`
    : "";

  // Typography class map
  const fontSizeClasses = {
    sm: "text-[15px] sm:text-[16px] leading-[1.75]",
    base: "text-[17px] sm:text-[18px] md:text-[19px] leading-[1.82]",
    lg: "text-[19px] sm:text-[20px] md:text-[21px] leading-[1.88]",
    xl: "text-[21px] sm:text-[22px] md:text-[23px] leading-[1.92]",
  };

  const fontFamilyClasses = {
    serif: "font-serif",
    sans: "font-reader",
    mono: "font-body",
  };

  // Reading Theme styles
  const themeStyles = {
    parchment: {
      sheetBg: "linear-gradient(180deg, #f9f3e9 0%, #f5ece0 45%, #efe5d5 100%)",
      sheetText: "#25201c",
      sheetEyebrow: "#8d8174",
      sheetHeading: "#1c1714",
      sheetDivider: "#d8cbb8",
      controlBg: "rgba(238, 228, 215, 0.88)",
      controlBorder: "rgba(75, 55, 35, 0.12)",
      controlText: "#25201c",
      controlMuted: "#867a6d",
    },
    sepia: {
      sheetBg: "linear-gradient(180deg, #ede0cb 0%, #e7d8c1 45%, #dfcdb3 100%)",
      sheetText: "#2b231b",
      sheetEyebrow: "#8e7c6d",
      sheetHeading: "#221a13",
      sheetDivider: "#cfbea9",
      controlBg: "rgba(228, 214, 194, 0.9)",
      controlBorder: "rgba(75, 55, 35, 0.14)",
      controlText: "#2b231b",
      controlMuted: "#8a7869",
    },
    night: {
      sheetBg: "linear-gradient(180deg, #1f1b19 0%, #1a1715 45%, #151210 100%)",
      sheetText: "#ddd4c6",
      sheetEyebrow: "#918679",
      sheetHeading: "#eee6da",
      sheetDivider: "#38312b",
      controlBg: "rgba(32, 27, 24, 0.9)",
      controlBorder: "rgba(255, 255, 255, 0.1)",
      controlText: "#ddd4c6",
      controlMuted: "#918679",
    },
  }[theme];

  return (
    <div className="motion-reading-room flex flex-col h-[100dvh] w-full select-none">
      
      {/* ATMOSPHERIC BACKGROUND: Window View onto Sunset Skyline & Golden Light */}
      <div className="motion-room-backdrop" aria-hidden="true">
        <div className="motion-room-window" />
        <div className="motion-room-desk-props" />
      </div>

      {/* 1. TOP TOOLBAR */}
      <div role="region" aria-label="Reading toolbar" className="motion-reading-toolbar relative z-30 flex items-center justify-between px-6 sm:px-10 h-14 bg-[#ede4d6]/95 backdrop-blur-md border-b border-[#dfd2c0] text-[#1c1815] shrink-0">
        
        {/* Left: Wordmark & Breadcrumb */}
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <Link
            href="/"
            className="text-2xl sm:text-3xl italic tracking-tighter text-[#161413] hover:opacity-80 transition-opacity shrink-0 font-normal"
            style={{ fontFamily: "var(--font-motion), Georgia, serif" }}
            aria-label="PAGE.OS Home"
          >
            P/OS
          </Link>

          <div className="h-4 w-[1px] bg-black/15 hidden sm:block shrink-0" />

          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-sans text-[#786e63] truncate">
            <Link
              href="/library"
              className="hover:text-[#181512] transition-colors truncate hidden sm:inline text-[#786e63]"
            >
              Library
            </Link>
            <span className="text-[#b5a99a] select-none hidden sm:inline">›</span>
            <span className="text-[#181512] font-medium truncate max-w-[200px] md:max-w-md">
              {book?.title || "Reading"}
            </span>
          </nav>
        </div>

        {/* Right: Actions (Search, Typography Aa, Theme, Options) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 mr-12 sm:mr-14">
          
          {/* Mobile Sidebar Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-lg hover:bg-black/5 text-[#5e5449] hover:text-[#181512]"
            aria-label={isSidebarOpen ? "Close table of contents" : "Open table of contents"}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>

          {/* Search in Book */}
          <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`p-2 rounded-lg transition-colors ${isSearchOpen ? "bg-black/10 text-[#181512]" : "hover:bg-black/5 text-[#5e5449] hover:text-[#181512]"}`}
                aria-label="Search within book"
              >
                <Search className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 sm:w-96 bg-[#f7f0e4] border border-[#d6c7b2] p-3 rounded-2xl shadow-2xl text-[#1c1815]">
              <div className="flex items-center gap-2 border-b border-black/10 pb-2.5">
                <Search className="w-4 h-4 text-[#8a7f72] shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={bookSearchQuery}
                  onChange={(e) => setBookSearchQuery(e.target.value)}
                  placeholder="Find in book..."
                  className="w-full bg-transparent border-0 outline-none text-xs text-[#1c1815] placeholder-[#8a7f72]"
                  autoFocus
                />
                {bookSearchQuery && (
                  <button type="button" onClick={() => setBookSearchQuery("")} className="text-[#8a7f72] hover:text-[#1c1815]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto mt-2 space-y-1.5 motion-clean-scrollbar">
                {bookSearchQuery.length < 2 ? (
                  <p className="text-[11px] text-[#8a7f72] py-4 text-center">Type at least 2 characters to search across chapters.</p>
                ) : searchResults.length === 0 ? (
                  <p className="text-[11px] text-[#8a7f72] py-4 text-center">No matches found for “{bookSearchQuery}”.</p>
                ) : (
                  searchResults.map((res, i) => (
                    <button
                      key={`search-res-${i}`}
                      type="button"
                      onClick={() => {
                        setDirection(res.sectorIndex > activeSector ? 1 : -1);
                        setActiveSector(res.sectorIndex);
                        setIsSearchOpen(false);
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-black/5 transition-colors text-xs"
                    >
                      <p className="font-medium text-[#1c1815] text-[11px] uppercase tracking-wider">{res.title}</p>
                      <p className="text-[#655b50] text-[11.5px] mt-0.5 line-clamp-2">{res.snippet}</p>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Typography & Appearance (Aa) */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="px-2.5 py-1.5 rounded-lg hover:bg-black/5 text-[#5e5449] hover:text-[#181512] font-serif text-sm font-medium"
                aria-label="Reading appearance settings"
              >
                Aa
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 bg-[#f7f0e4] border border-[#d6c7b2] p-4 rounded-2xl shadow-2xl text-[#1c1815]">
              <h4 className="text-[11px] font-sans font-semibold tracking-widest uppercase text-[#8a7f72] mb-3">
                Reading Appearance
              </h4>

              {/* Font Size */}
              <div className="mb-4">
                <label className="text-xs text-[#5e5449] block mb-1.5">Size</label>
                <div className="grid grid-cols-4 gap-1.5 bg-black/5 p-1 rounded-xl">
                  {(["sm", "base", "lg", "xl"] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => handleSetFontSize(sz)}
                      className={`py-1 text-xs rounded-lg font-medium transition-all ${fontSize === sz ? "bg-white text-[#181512] shadow-sm" : "text-[#7a6f63] hover:text-[#181512]"}`}
                    >
                      {sz.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Family */}
              <div className="mb-4">
                <label className="text-xs text-[#5e5449] block mb-1.5">Typeface</label>
                <div className="grid grid-cols-3 gap-1.5 bg-black/5 p-1 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => handleSetFontFamily("serif")}
                    className={`py-1 rounded-lg font-serif transition-all ${fontFamily === "serif" ? "bg-white text-[#181512] shadow-sm font-semibold" : "text-[#7a6f63] hover:text-[#181512]"}`}
                  >
                    Serif
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetFontFamily("sans")}
                    className={`py-1 rounded-lg font-sans transition-all ${fontFamily === "sans" ? "bg-white text-[#181512] shadow-sm font-semibold" : "text-[#7a6f63] hover:text-[#181512]"}`}
                  >
                    Sans
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetFontFamily("mono")}
                    className={`py-1 rounded-lg font-mono transition-all ${fontFamily === "mono" ? "bg-white text-[#181512] shadow-sm font-semibold" : "text-[#7a6f63] hover:text-[#181512]"}`}
                  >
                    Mono
                  </button>
                </div>
              </div>

              {/* Reading Theme */}
              <div>
                <label className="text-xs text-[#5e5449] block mb-1.5">Palette</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetTheme("parchment")}
                    className={`p-2 rounded-xl border text-left flex flex-col gap-1 transition-all ${theme === "parchment" ? "border-black/40 ring-1 ring-black/20" : "border-black/10 hover:border-black/25"}`}
                    style={{ background: "#f7efe2" }}
                  >
                    <span className="text-[10px] font-medium text-[#221d19]">Parchment</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetTheme("sepia")}
                    className={`p-2 rounded-xl border text-left flex flex-col gap-1 transition-all ${theme === "sepia" ? "border-black/40 ring-1 ring-black/20" : "border-black/10 hover:border-black/25"}`}
                    style={{ background: "#ebdcc4" }}
                  >
                    <span className="text-[10px] font-medium text-[#2b231b]">Sepia</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetTheme("night")}
                    className={`p-2 rounded-xl border text-left flex flex-col gap-1 transition-all ${theme === "night" ? "border-white/40 ring-1 ring-white/20" : "border-white/10 hover:border-white/25"}`}
                    style={{ background: "#1c1815" }}
                  >
                    <span className="text-[10px] font-medium text-[#ddd4c6]">Night</span>
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Ambience Audio Player */}
          <Popover open={isAmbienceOpen} onOpenChange={setIsAmbienceOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-sans font-medium ${
                  isAmbiencePlaying
                    ? "bg-[#251e19] text-[#f4efe7] shadow-sm"
                    : isAmbienceOpen
                      ? "bg-black/10 text-[#181512]"
                      : "hover:bg-black/5 text-[#5e5449] hover:text-[#181512]"
                }`}
                aria-label="Reading atmosphere and ambience sounds"
                title={isAmbiencePlaying && activeSound ? `Ambience: ${activeSound.name}` : "Reading Ambience (Soundscapes)"}
              >
                <Headphones className={`w-3.5 h-3.5 ${isAmbiencePlaying ? "text-[#e8b577] animate-pulse" : ""}`} />
                <span className="hidden sm:inline-block max-w-[95px] truncate">
                  {isAmbiencePlaying && activeSound ? activeSound.name : "Ambience"}
                </span>
                {isAmbiencePlaying && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e8b577] animate-ping ml-0.5" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-80 sm:w-96 bg-[#f7f0e4] border border-[#d6c7b2] p-4 rounded-2xl shadow-2xl text-[#1c1815]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-black/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-black/5 flex items-center justify-center text-[#251e19]">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-sans font-semibold tracking-widest uppercase text-[#8a7f72]">
                      Reading Ambience
                    </h4>
                    <p className="text-xs font-medium text-[#1c1815] truncate max-w-[170px]">
                      {isAmbiencePlaying && activeSound ? activeSound.name : "Silence (Off)"}
                    </p>
                  </div>
                </div>

                {isAmbiencePlaying && (
                  <button
                    type="button"
                    onClick={() => void stopAmbience()}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[#842e24] hover:bg-[#842e24]/10 transition-colors"
                    title="Silence all ambience"
                  >
                    <Power className="w-3 h-3" />
                    <span>Mute</span>
                  </button>
                )}
              </div>

              {/* Volume Slider */}
              <div className="py-3 border-b border-black/10">
                <div className="flex items-center justify-between mb-1.5 text-xs text-[#5e5449]">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#8a7f72]">
                    <Volume2 className="w-3.5 h-3.5 text-[#5e5449]" />
                    Volume
                  </span>
                  <span className="font-mono text-[11px] text-[#251e19]">
                    {Math.round(ambienceVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isAmbienceMuted ? 0 : ambienceVolume}
                  onChange={(e) => setAmbienceVolume(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-black/10 rounded-full appearance-none cursor-pointer accent-[#231d19]"
                  aria-label="Ambience volume"
                />
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1 py-2.5 overflow-x-auto motion-clean-scrollbar">
                <button
                  type="button"
                  onClick={() => setAmbienceCategory("all")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 ${
                    ambienceCategory === "all"
                      ? "bg-[#251e19] text-[#f7efe4] shadow-sm"
                      : "bg-black/5 text-[#63574c] hover:bg-black/10"
                  }`}
                >
                  All
                </button>
                {AMBIENCE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setAmbienceCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 ${
                      ambienceCategory === cat.id
                        ? "bg-[#251e19] text-[#f7efe4] shadow-sm"
                        : "bg-black/5 text-[#63574c] hover:bg-black/10"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Sound list cards */}
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5 motion-clean-scrollbar mt-1">
                {filteredAmbienceSounds.map((sound) => {
                  const isCurrentActive = activeSound?.id === sound.id && isAmbiencePlaying;
                  return (
                    <button
                      key={sound.id}
                      type="button"
                      onClick={() => void handleToggleSound(sound)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                        isCurrentActive
                          ? "bg-[#251e19] text-[#f7efe4] shadow-md"
                          : "hover:bg-black/5 text-[#1c1815] bg-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isCurrentActive
                              ? "bg-white/15 text-[#e8b577]"
                              : "bg-black/5 text-[#5e5449]"
                          }`}
                        >
                          <AmbienceSoundIcon name={sound.iconName} className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-medium truncate ${isCurrentActive ? "text-[#f7efe4]" : "text-[#1c1815]"}`}>
                            {sound.name}
                          </p>
                          <p className={`text-[10px] truncate max-w-[190px] ${isCurrentActive ? "text-[#d6c7b2]" : "text-[#8a7f72]"}`}>
                            {sound.description}
                          </p>
                        </div>
                      </div>

                      {isCurrentActive ? (
                        <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#e8b577] px-1.5 py-0.5 rounded bg-white/10 shrink-0">
                          Playing
                        </span>
                      ) : (
                        <span className="text-[10px] font-sans text-[#8a7f72] shrink-0 opacity-0 group-hover:opacity-100">
                          Play
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Theme Quick Toggle (Reference Contrast Circle) */}
          <button
            type="button"
            onClick={() => {
              const next: Record<MotionReaderTheme, MotionReaderTheme> = {
                parchment: "sepia",
                sepia: "night",
                night: "parchment",
              };
              handleSetTheme(next[theme]);
            }}
            className="p-2 rounded-lg hover:bg-black/5 text-[#5e5449] hover:text-[#181512] transition-colors"
            aria-label={`Cycle theme (current: ${theme})`}
            title={`Theme: ${theme}`}
          >
            <div className="w-4 h-4 rounded-full border border-current overflow-hidden flex rotate-45 shrink-0">
              <div className="w-1/2 h-full bg-current" />
              <div className="w-1/2 h-full bg-transparent" />
            </div>
          </button>

          {/* More Reading Options (...) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-black/5 text-[#5e5449] hover:text-[#181512] transition-colors"
                aria-label="More reading options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-[#f7f0e4] border border-[#d6c7b2] p-1.5 rounded-xl shadow-xl text-[#1c1815]">
              <DropdownMenuItem
                onClick={() => setIsAmbienceOpen(true)}
                className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg cursor-pointer hover:bg-black/5"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Reading Ambience</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-black/10 my-1" />
              <DropdownMenuItem
                onClick={toggleBookmark}
                disabled={isBookmarkLoading}
                className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg cursor-pointer hover:bg-black/5"
              >
                <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? "fill-current" : ""}`} />
                <span>{isBookmarked ? "Remove Bookmark" : "Bookmark Book"}</span>
              </DropdownMenuItem>
              {onShowBriefing && (
                <DropdownMenuItem
                  onClick={onShowBriefing}
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg cursor-pointer hover:bg-black/5"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Book Synopsis</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={handleShare}
                className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg cursor-pointer hover:bg-black/5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Passage Link</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={toggleFullscreen}
                className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg cursor-pointer hover:bg-black/5"
              >
                <Maximize className="w-3.5 h-3.5" />
                <span>Toggle Fullscreen</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-black/10 my-1" />
              <DropdownMenuItem
                onClick={() => router.push("/")}
                className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg cursor-pointer hover:bg-black/5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Home (Discover)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/library")}
                className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg cursor-pointer hover:bg-black/5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Back to Library</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>

      {/* 2. MAIN READING ARENA: Sidebar + Parchment Sheet */}
      <div className="relative z-10 flex flex-1 h-[calc(100dvh-3.5rem)] overflow-hidden p-3 sm:p-5 md:p-6 lg:p-8 gap-5 lg:gap-8 max-w-[1760px] mx-auto w-full">
        
        {/* LEFT READING SIDEBAR */}
        <aside
          className={`motion-reading-sidebar flex flex-col shrink-0 w-72 lg:w-80 h-full overflow-hidden transition-all duration-300 ${
            isSidebarOpen
              ? "translate-x-0 opacity-100"
              : "-translate-x-full md:translate-x-0 opacity-0 md:opacity-100 hidden md:flex"
          }`}
        >
          {/* Book Information Header */}
          <div className="p-5 pb-4 border-b border-white/8">
            <div className="flex gap-3.5 items-start">
              {/* Cover thumbnail */}
              <div className="relative w-14 h-20 shrink-0 rounded-[4px] overflow-hidden bg-[#241e1a] shadow-md border border-white/10">
                {coverUrl ? (
                  <Image src={coverUrl} alt={book?.title || "Cover"} fill sizes="56px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] text-white/50 bg-[#2b221a]">
                    Book
                  </div>
                )}
              </div>

              {/* Title, Author, Reading Progress */}
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-serif font-medium text-[#f0e7dc] leading-tight line-clamp-2">
                  {book?.title}
                </h2>
                <p className="text-xs text-[#a09485] font-sans truncate mt-1">
                  {book?.authors || "Unknown author"}
                </p>

                {/* Progress bar + percentage */}
                <div className="flex items-center gap-2 mt-3">
                  <div className="h-1 flex-1 bg-white/15 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white/90 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, completion))}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-sans text-[#a5998b] shrink-0 font-medium min-w-[32px] text-right">
                    {completion.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Navigation Tabs */}
          <div className="px-5 pt-3.5 pb-2">
            <div className="grid grid-cols-3 gap-1 p-1 bg-black/30 rounded-xl border border-white/5 text-xs font-sans">
              <button
                type="button"
                onClick={() => setActiveTab("contents")}
                className={`py-1.5 rounded-lg text-center font-medium transition-all ${
                  activeTab === "contents"
                    ? "bg-[#ece4d6] text-[#1c1815] shadow-sm"
                    : "text-[#a29586] hover:text-[#e8dfd3]"
                }`}
              >
                Contents
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("bookmarks")}
                className={`py-1.5 rounded-lg text-center font-medium transition-all ${
                  activeTab === "bookmarks"
                    ? "bg-[#ece4d6] text-[#1c1815] shadow-sm"
                    : "text-[#a29586] hover:text-[#e8dfd3]"
                }`}
              >
                Bookmarks
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("notes")}
                className={`py-1.5 rounded-lg text-center font-medium transition-all ${
                  activeTab === "notes"
                    ? "bg-[#ece4d6] text-[#1c1815] shadow-sm"
                    : "text-[#a29586] hover:text-[#e8dfd3]"
                }`}
              >
                Notes
              </button>
            </div>
          </div>

          {/* TAB 1: Contents (Table of Contents with Roman numerals) */}
          {activeTab === "contents" && (
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 motion-clean-scrollbar">
              {toc.length === 0 ? (
                <div className="text-xs text-[#8c8072] text-center py-8">
                  Continuous archive stream. Use bottom slider to navigate.
                </div>
              ) : (
                toc.map((entry, index) => {
                  const nextEntry = toc[index + 1];
                  const isActive =
                    activeSector >= entry.sectorIndex &&
                    (!nextEntry || activeSector < nextEntry.sectorIndex);
                  const romanIndex = toRoman(index + 1);

                  return (
                    <button
                      key={`${entry.title}-${entry.sectorIndex}`}
                      type="button"
                      onClick={() => {
                        setDirection(entry.sectorIndex > activeSector ? 1 : -1);
                        setActiveSector(entry.sectorIndex);
                        if (window.innerWidth < 768) setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left flex items-start gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-xs ${
                        isActive
                          ? "bg-white/12 text-[#f6efe7] font-medium shadow-sm"
                          : "text-[#a79a8c] hover:text-[#f0e7dc] hover:bg-white/5"
                      }`}
                    >
                      <span className="font-serif w-8 shrink-0 text-[#8a7f72] text-[11px] pt-0.5">
                        {romanIndex}.
                      </span>
                      <span className="truncate leading-snug">
                        {entry.title}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: Bookmarks */}
          {activeTab === "bookmarks" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 motion-clean-scrollbar">
              <button
                type="button"
                onClick={toggleBookmark}
                disabled={isBookmarkLoading}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs text-[#e8ded0] transition-colors"
              >
                <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? "fill-current" : ""}`} />
                <span>{isBookmarked ? "Bookmarked (Click to Remove)" : "Bookmark Current Page"}</span>
              </button>

              <div className="pt-2">
                <p className="text-[11px] font-sans uppercase tracking-widest text-[#8a7f72] mb-2">Saved Places</p>
                {isBookmarked ? (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/8 text-xs">
                    <p className="font-serif font-medium text-[#f0e7dc]">{displayChapterTitle}</p>
                    <p className="text-[11px] text-[#9a8d7d] mt-1 font-sans">
                      Page {activeSector + 1} of {sectors.length} ({completion.toFixed(0)}%)
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-[#8a7f72] italic text-center py-6">
                    No active bookmark saved for this title. Click above to save your place.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Notes & Marginalia */}
          {activeTab === "notes" && (
            <div className="flex-1 flex flex-col overflow-hidden p-4">
              <div className="mb-3">
                <textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder={`Write a note on chapter ${currentChapterNumber}...`}
                  rows={2}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-[#e8ded0] placeholder-[#7d7265] outline-none focus:border-white/25 resize-none font-sans"
                />
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!newNoteText.trim()}
                  className="mt-1.5 w-full py-1.5 bg-[#ece4d6] hover:bg-white text-[#1c1815] font-medium text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                  Save Note
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 motion-clean-scrollbar">
                {notes.length === 0 ? (
                  <p className="text-xs text-[#8a7f72] italic text-center py-6">
                    No notes yet. Add thoughts and marginalia while reading.
                  </p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="p-2.5 rounded-xl bg-white/5 border border-white/8 text-xs group">
                      <div className="flex items-center justify-between text-[10px] text-[#8a7f72] mb-1">
                        <span>Page {note.sectorIndex + 1} • {note.date}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[#e2d8cb] leading-relaxed select-text">{note.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </aside>

        {/* 3. MAIN PARCHMENT READING SHEET */}
        <main
          className="motion-parchment-sheet flex-1 h-full flex flex-col shadow-2xl relative min-w-0"
          style={{ background: themeStyles.sheetBg }}
        >
          {/* Subtle Diagonal Window-Pane Shadow across the sheet */}
          <div className="motion-window-shadow-cast" aria-hidden="true" />

          {/* Reading Prose Body Container (Scrollable) */}
          <div
            ref={readingViewportRef}
            className="flex-1 overflow-y-auto px-6 sm:px-12 md:px-16 lg:px-24 pt-12 sm:pt-16 pb-28 motion-clean-scrollbar relative z-10"
          >
            <div className={`mx-auto ${measureWidth === "wide" ? "max-w-3xl" : "max-w-2xl"}`}>
              
              {/* Chapter Header */}
              <div className="mb-10 sm:mb-12 text-center sm:text-left">
                {/* Chapter Eyebrow */}
                <p
                  className="text-xs sm:text-[13px] uppercase tracking-[0.25em] font-serif font-medium mb-3"
                  style={{ color: themeStyles.sheetEyebrow }}
                >
                  {chapterEyebrow}
                </p>

                {/* Chapter Title */}
                <h1
                  className="text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight leading-[1.08] mb-4"
                  style={{
                    fontFamily: "var(--font-motion), Georgia, serif",
                    color: themeStyles.sheetHeading,
                  }}
                >
                  {displayChapterTitle}
                </h1>

                {/* Decorative short divider line beneath heading */}
                <div
                  className="w-12 h-[1px] my-4 mx-auto sm:mx-0"
                  style={{ backgroundColor: themeStyles.sheetDivider }}
                />
              </div>

              {/* Book Text Paragraphs */}
              <div
                className={`${fontSizeClasses[fontSize]} ${fontFamilyClasses[fontFamily]} prose prose-neutral max-w-none select-text`}
                style={{ color: themeStyles.sheetText }}
              >
                {currentSector?.paragraphs && currentSector.paragraphs.length > 0 ? (
                  currentSector.paragraphs.map((para, idx) => (
                    <p
                      key={`para-${currentSector.startParagraphIndex}-${idx}`}
                      className="mb-6 sm:mb-7 leading-[1.85] text-justify tracking-normal"
                    >
                      {para}
                    </p>
                  ))
                ) : (
                  <p className="text-base italic opacity-75">
                    No content extracted for this leaf.
                  </p>
                )}
              </div>

            </div>
          </div>

          {/* 4. BOTTOM READING PROGRESS & NAVIGATION PILL BAR */}
          <div className="absolute bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 w-[92%] sm:w-auto min-w-[300px] sm:min-w-[420px] max-w-lg">
            <div
              className="flex items-center justify-between gap-4 px-5 sm:px-6 py-2.5 rounded-full shadow-lg border backdrop-blur-md transition-all"
              style={{
                backgroundColor: themeStyles.controlBg,
                borderColor: themeStyles.controlBorder,
                color: themeStyles.controlText,
              }}
            >
              {/* Previous Chapter / Page */}
              <button
                type="button"
                onClick={() => paginate(-1)}
                disabled={activeSector === 0}
                className="flex items-center gap-1.5 text-xs font-sans font-medium hover:opacity-75 disabled:opacity-30 transition-opacity"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              {/* Interactive Reading Slider Track */}
              <div className="flex-1 flex items-center gap-2.5 mx-2">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, sectors.length - 1)}
                  value={activeSector}
                  onChange={(e) => {
                    const target = parseInt(e.target.value, 10);
                    setDirection(target > activeSector ? 1 : -1);
                    setActiveSector(target);
                  }}
                  className="w-full h-1 bg-black/15 rounded-full appearance-none cursor-pointer accent-[#231d19]"
                  aria-label="Reading progress position"
                />
                <span
                  className="text-[11px] font-sans font-medium shrink-0 min-w-[32px] text-right"
                  style={{ color: themeStyles.controlMuted }}
                >
                  {completion.toFixed(1)}%
                </span>
              </div>

              {/* Next Chapter / Page */}
              <button
                type="button"
                onClick={() => paginate(1)}
                disabled={activeSector >= sectors.length - 1}
                className="flex items-center gap-1.5 text-xs font-sans font-medium hover:opacity-75 disabled:opacity-30 transition-opacity"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </main>

      </div>
    </div>
  );
}
