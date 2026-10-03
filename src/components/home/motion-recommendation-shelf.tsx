"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Sparkles, BookOpen, LoaderCircle } from "lucide-react";
import type { SearchResult } from "@/adapters/sourceManager";

export type LoungeGenre<T extends string = string> = {
  readonly key: T;
  readonly label: string;
  readonly eyebrow: string;
  readonly heading: string;
  readonly query: string;
};

interface MotionRecommendationShelfProps<T extends LoungeGenre = LoungeGenre> {
  genres: readonly T[];
  selectedGenre: T;
  onSelectGenre: (genre: T) => void;
  books: SearchResult[];
  isLoading: boolean;
  sourceLabel: string;
  onBookClick: (book: SearchResult) => void;
}

// Natural varying book tilts for physical shelf feel
const TILT_CONFIGS = [
  { rotZ: -3.8, rotY: 6, shadowX: -8, lift: -2 },
  { rotZ: 3.4, rotY: -5, shadowX: 8, lift: 2 },
  { rotZ: -2.2, rotY: 4, shadowX: -5, lift: -1 },
  { rotZ: 4.2, rotY: -7, shadowX: 10, lift: 3 },
  { rotZ: -4.0, rotY: 7, shadowX: -9, lift: -3 },
  { rotZ: 2.6, rotY: -4, shadowX: 6, lift: 1 },
  { rotZ: -3.2, rotY: 5, shadowX: -7, lift: -2 },
  { rotZ: 3.8, rotY: -6, shadowX: 9, lift: 2 },
  { rotZ: -2.5, rotY: 4, shadowX: -6, lift: -1 },
  { rotZ: 3.0, rotY: -5, shadowX: 7, lift: 2 },
];

function getBookCover(book: SearchResult): string {
  if (book.source === "gutendex") {
    return `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.cover.medium.jpg`;
  }
  return "";
}

export default function MotionRecommendationShelf<T extends LoungeGenre = LoungeGenre>({
  genres,
  selectedGenre,
  onSelectGenre,
  books,
  isLoading,
  sourceLabel,
  onBookClick,
}: MotionRecommendationShelfProps<T>) {
  const shelfRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const isHoveredRef = useRef(false);

  // Duplicate items for a seamless, continuous infinite scroll strip
  const displayBooks = useMemo(() => {
    if (books.length === 0) return [];
    if (books.length < 8) {
      return [...books, ...books, ...books, ...books];
    }
    return [...books, ...books];
  }, [books]);

  // Auto-drift animation engine (slow, calm horizontal gliding)
  useEffect(() => {
    const el = shelfRef.current;
    if (!el || displayBooks.length === 0) return;

    let animId: number;
    const speed = 0.55; // Pixels per frame (~33px/sec at 60fps)
    // Browsers floor fractional scrollLeft assignments, so `scrollLeft += 0.55`
    // never actually moves in Chrome. Accumulate the fractional position here
    // and write the running total instead.
    let driftPosition = el.scrollLeft;

    const step = () => {
      if (
        !isHoveredRef.current &&
        !isDraggingRef.current &&
        !isInteractingRef.current &&
        el
      ) {
        driftPosition += speed;
        const halfWidth = el.scrollWidth / 2;
        if (halfWidth > 0 && driftPosition >= halfWidth) {
          driftPosition -= halfWidth;
        }
        el.scrollLeft = driftPosition;
      } else {
        // Stay in sync while the user hovers or drags the shelf manually.
        driftPosition = el.scrollLeft;
      }
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [displayBooks.length]);


  const isPointerDownRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragScrollLeftRef = useRef(0);
  const dragDistanceRef = useRef(0);
  const isDraggingRef = useRef(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInteractingRef = useRef(false);

  // Pointer drag to scroll without capturing/blocking button clicks
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = shelfRef.current;
    if (!el) return;
    isPointerDownRef.current = true;
    dragStartXRef.current = e.clientX;
    dragScrollLeftRef.current = el.scrollLeft;
    dragDistanceRef.current = 0;
    isDraggingRef.current = false;
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!isPointerDownRef.current) return;
      const el = shelfRef.current;
      if (!el) return;
      const dx = e.clientX - dragStartXRef.current;
      dragDistanceRef.current = Math.abs(dx);

      if (dragDistanceRef.current > 5) {
        isDraggingRef.current = true;
        el.style.cursor = "grabbing";
        el.scrollLeft = dragScrollLeftRef.current - dx;

        // Handle seamless wrap during manual drag
        const halfWidth = el.scrollWidth / 2;
        if (halfWidth > 0) {
          if (el.scrollLeft >= halfWidth) el.scrollLeft -= halfWidth;
          else if (el.scrollLeft <= 0) el.scrollLeft += halfWidth;
        }
      }
    };

    const onPointerUp = () => {
      if (!isPointerDownRef.current) return;
      isPointerDownRef.current = false;
      const el = shelfRef.current;
      if (el) {
        el.style.cursor = "grab";
      }

      if (isDraggingRef.current) {
        isInteractingRef.current = true;
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
          isInteractingRef.current = false;
          isDraggingRef.current = false;
          dragDistanceRef.current = 0;
        }, 1200);
      } else {
        dragDistanceRef.current = 0;
        isDraggingRef.current = false;
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    // Browsers fire pointercancel instead of pointerup when they steal the
    // gesture (vertical page scroll, rotation, app switch). Without this
    // listener the drag refs stayed wedged after the cancel and the drift
    // never resumed on touch devices.
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  const handleScrollLeft = () => {
    if (!shelfRef.current) return;
    shelfRef.current.scrollBy({ left: -380, behavior: "smooth" });
    isInteractingRef.current = true;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      isInteractingRef.current = false;
    }, 1800);
  };

  const handleScrollRight = () => {
    if (!shelfRef.current) return;
    shelfRef.current.scrollBy({ left: 380, behavior: "smooth" });
    isInteractingRef.current = true;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      isInteractingRef.current = false;
    }, 1800);
  };

  const handleCardClick = (e: React.MouseEvent, book: SearchResult) => {
    e.stopPropagation();
    // If the user was actually dragging across the shelf, suppress click
    if (isDraggingRef.current || dragDistanceRef.current > 5) return;
    onBookClick(book);
  };

  return (
    <section className="motion-shelf-section" aria-label="Curated recommendations shelf">
      {/* Top Header */}
      <div className="motion-shelf-heading">
        <div>
          <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
            <span className="text-xs font-mono font-semibold tracking-[0.2em] text-[#ff3c78] uppercase">
              A CURATED DRIFT
            </span>
            <span className="text-[0.68rem] tracking-wider text-[#d7ff3f] uppercase font-mono font-medium px-2.5 py-0.5 rounded-full bg-[#d7ff3f]/15 border border-[#d7ff3f]/35 shadow-sm">
              {selectedGenre.label}
            </span>
            {sourceLabel && (
              <span className="text-[0.68rem] tracking-wider text-[#f4efe7]/70 uppercase font-mono hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                {sourceLabel}
              </span>
            )}
            {isPaused && (
              <span className="text-[0.68rem] tracking-wider uppercase font-mono text-[#ff5c93] px-2.5 py-0.5 rounded-full bg-[#ff3c78]/15 border border-[#ff3c78]/30 animate-pulse font-medium">
                Paused (Hover)
              </span>
            )}
          </div>
          <h2 className="text-[#f4efe7] font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight leading-tight">
            {selectedGenre.heading || "Books with a pulse"}
          </h2>
          <p className="text-[#f4efe7]/80 text-sm sm:text-base mt-2 max-w-2xl font-light leading-relaxed">
            {selectedGenre.eyebrow} — hover any book to pause the drift, or drag to explore.
          </p>
        </div>

        {/* Navigation & Controls */}
        <div className="flex flex-col items-end gap-3">
          <div className="hidden lg:flex items-center gap-2 text-[0.68rem] tracking-widest uppercase text-[#f4efe7]/60 font-mono">
            <span>HOVER TO PAUSE</span>
            <span>•</span>
            <span>DRAG TO BROWSE</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleScrollLeft}
              className="w-10 h-10 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-[#f4efe7] flex items-center justify-center transition-all shadow-md active:scale-95"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleScrollRight}
              className="w-10 h-10 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-[#f4efe7] flex items-center justify-center transition-all shadow-md active:scale-95"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Genre Pills / Category Tabs */}
      <div
        className="flex items-center gap-2.5 overflow-x-auto py-3 mb-6 scrollbar-none"
        role="tablist"
        aria-label="Recommendation genres"
      >
        {genres.map((genre) => {
          const isActive = selectedGenre.key === genre.key;
          return (
            <button
              key={genre.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectGenre(genre)}
              className={`px-4 py-2 rounded-full text-xs font-medium tracking-wide transition-all whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? "bg-[#f4efe7] text-[#121016] font-semibold shadow-lg shadow-black/40 scale-105 border border-[#f4efe7]"
                  : "bg-[#25212c] text-[#f4efe7]/85 hover:text-[#ffffff] hover:bg-[#322c3c] border border-white/15 hover:border-white/30 shadow-sm"
              }`}
            >
              {isActive && <Sparkles className="w-3.5 h-3.5 text-[#ff3c78]" />}
              {genre.label}
              {isActive && isLoading && (
                <LoaderCircle className="w-3 h-3 animate-spin text-[#18151c]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Horizontal Scroll Track */}
      <div
        ref={shelfRef}
        className="motion-drift-scroll"
        onPointerEnter={(e) => {
          // Touch taps emulate mouse enter/leave, but mouseleave only fires
          // when the user taps elsewhere — the old hover-pause stayed wedged
          // after the first touch and froze the drift on mobile. Only real
          // mouse pointers may pause the shelf.
          if (e.pointerType !== "mouse") return;
          isHoveredRef.current = true;
          setIsPaused(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType !== "mouse") return;
          isHoveredRef.current = false;
          setIsPaused(false);
        }}
        onPointerDown={handlePointerDown}
      >
        <div className="motion-drift-track">
          {displayBooks.length > 0 ? (
            displayBooks.map((book, index) => {
              const tilt = TILT_CONFIGS[index % TILT_CONFIGS.length];
              const coverUrl = getBookCover(book);
              const originalIndex = index % (books.length || 1);

              return (
                <div
                  key={`${book.source}-${book.id}-${index}`}
                  className="motion-drift-item"
                  style={
                    {
                      "--tilt-z": `${tilt.rotZ}deg`,
                      "--tilt-y": `${tilt.rotY}deg`,
                      "--shadow-x": `${tilt.shadowX}px`,
                      "--lift": `${tilt.lift}px`,
                    } as CSSProperties
                  }
                >
                  <button
                    type="button"
                    onClick={(e) => handleCardClick(e, book)}
                    className="motion-drift-card text-left"
                    aria-label={`Open briefing for ${book.title}`}
                  >
                    {/* 3D Physical Book Volume with Realistic Tilt */}
                    <div className="motion-book-volume">
                      {coverUrl ? (
                        <div
                          className="motion-book-cover-surface"
                          style={{ backgroundImage: `url(${coverUrl})` }}
                        />
                      ) : (
                        <div className="motion-book-cover-surface motion-book-cover-placeholder">
                          <BookOpen className="w-8 h-8 text-white/40 mb-2" />
                          <span className="text-xs font-serif line-clamp-3 text-white/90 px-3 text-center">
                            {book.title}
                          </span>
                        </div>
                      )}
                      {/* Spine Ridge / Emboss */}
                      <div className="motion-book-spine-crease" aria-hidden="true" />
                      {/* Page Edge Trim on Right */}
                      <div className="motion-book-page-trim" aria-hidden="true" />
                      {/* Hover Overlay Pill */}
                      <div className="motion-book-hover-pill">
                        <span>Read Book</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Book Metadata */}
                    <div className="motion-drift-meta">
                      <span className="motion-drift-index">
                        {String(originalIndex + 1).padStart(2, "0")}
                      </span>
                      <strong className="motion-drift-title" title={book.title}>
                        {book.title}
                      </strong>
                      <small className="motion-drift-author" title={book.authors}>
                        {book.authors || "Unknown author"}
                      </small>
                    </div>
                  </button>
                </div>
              );
            })
          ) : (
            /* Loading Skeleton */
            Array.from({ length: 8 }).map((_, index) => {
              const tilt = TILT_CONFIGS[index % TILT_CONFIGS.length];
              return (
                <div
                  key={`skeleton-${index}`}
                  className="motion-drift-item"
                  style={
                    {
                      "--tilt-z": `${tilt.rotZ}deg`,
                      "--tilt-y": `${tilt.rotY}deg`,
                      "--shadow-x": `${tilt.shadowX}px`,
                      "--lift": `${tilt.lift}px`,
                    } as CSSProperties
                  }
                >
                  <div className="motion-drift-card">
                    <div className="motion-book-volume animate-pulse bg-white/5 border border-white/10 rounded-md" />
                    <div className="motion-drift-meta animate-pulse mt-2 space-y-1">
                      <div className="h-3 w-8 bg-white/10 rounded" />
                      <div className="h-4 w-28 bg-white/10 rounded" />
                      <div className="h-3 w-20 bg-white/10 rounded" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
