'use client';

import * as React from 'react';
import { Compass, Infinity, Grid3x3, Pause, Play, Sparkles, Search, Plus, Zap, ChevronDown } from 'lucide-react';
import type { CameraState, ChunkCoord, MediaItem, WanderStats } from './types';
import { CHUNK_W, GRID_W, GRID_H, HERO_OFFSET, HERO_WIDTH, HERO_HEIGHT } from './useChunks';

// ── global image cache ──
const imageStateCache = new Map<string, { loaded: boolean; error: boolean }>();

export function MediaCard({ item, onSelect }: { item: MediaItem; onSelect?: (item: MediaItem) => void }) {
  const [loaded, setLoaded] = React.useState(() => imageStateCache.get(item.url)?.loaded ?? false);
  const [error, setError] = React.useState(() => imageStateCache.get(item.url)?.error ?? false);
  const mountedRef = React.useRef(true);
  const retryCount = React.useRef(0);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const tryLoad = React.useCallback(() => {
    if (typeof Image === 'undefined') return;
    const img = new Image();
    img.onload = () => {
      if (!mountedRef.current) return;
      setLoaded(true);
      setError(false);
      imageStateCache.set(item.url, { loaded: true, error: false });
    };
    img.onerror = () => {
      if (!mountedRef.current) return;
      retryCount.current += 1;
      if (retryCount.current <= 3) {
        setTimeout(tryLoad, 1000 * retryCount.current);
      } else {
        setError(true);
        imageStateCache.set(item.url, { loaded: false, error: true });
      }
    };
    img.src = item.url;
  }, [item.url]);

  React.useEffect(() => {
    if (!loaded && !error) tryLoad();
  }, [loaded, error, tryLoad]);

  return (
    <div
      className="break-inside-avoid mb-4 rounded-lg overflow-hidden bg-card border border-border hover:shadow-lg transition-shadow duration-300 cursor-pointer"
      onClick={() => onSelect?.(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.(item);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="relative w-full bg-muted/30">
        {error ? (
          <div
            className="w-full flex items-center justify-center bg-muted/20"
            style={{ aspectRatio: `${item.width}/${item.height}` }}
          >
            <span className="text-2xl opacity-25">&#x1F3A8;</span>
          </div>
        ) : (
          <>
            <img
              src={item.url}
              alt={item.title}
              className="w-full block"
              style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.6s ease' }}
            />
            {!loaded && (
              <div
                className="absolute inset-0 animate-pulse bg-muted/30 flex items-center justify-center"
                style={{ aspectRatio: `${item.width}/${item.height}` }}
              />
            )}
          </>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-xs font-body font-medium leading-snug line-clamp-2 text-foreground">
          {item.title}
        </h3>
        {(item.creator || item.year) && (
          <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed">
            {item.creator}
            {item.creator && item.year && <span className="mx-1 opacity-40">·</span>}
            {item.year}
          </p>
        )}
      </div>
    </div>
  );
}

export const MediaCardMemo = React.memo(MediaCard);

function GalleryFeedCard({
  item,
  index,
  onSelect,
}: {
  item: MediaItem;
  index: number;
  onSelect?: (item: MediaItem) => void;
}) {
  const [imageError, setImageError] = React.useState(false);

  return (
    <button type="button" className="art-feed-card" onClick={() => onSelect?.(item)}>
      {imageError ? (
        <span className="art-feed-missing-image" aria-label={`${item.title} image unavailable`}>
          <span>Archive image</span>
        </span>
      ) : (
        <img
          src={item.url}
          alt={item.title}
          loading={index < 12 ? 'eager' : 'lazy'}
          onError={() => setImageError(true)}
        />
      )}
      <span className="art-feed-card-info">
        <strong>{item.title}</strong>
        {(item.creator || item.year) && <small>{[item.creator, item.year].filter(Boolean).join(' · ')}</small>}
      </span>
    </button>
  );
}

/** A conventional, scrollable alternative to the spatial explorer. */
export function GalleryFeed({
  items,
  loading,
  onSelect,
}: {
  items: MediaItem[];
  loading: boolean;
  onSelect?: (item: MediaItem) => void;
}) {
  return (
    <section className="art-feed" aria-label="Artwork feed">
      <header className="art-feed-toolbar">
        <div className="art-feed-brand">
          <span className="art-feed-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span>PAGE.OS</span>
        </div>
        <nav className="art-feed-tabs" aria-label="Artwork sections">
          <button type="button" className="active">For you</button>
          <button type="button">Following</button>
          <button type="button">Explore</button>
        </nav>
        <label className="art-feed-search">
          <Search className="h-4 w-4" />
          <input aria-label="Search artwork" placeholder="Try ‘nocturnal landscapes’" />
          <span className="art-feed-search-spark"><Sparkles className="h-4 w-4" /></span>
        </label>
        <div className="art-feed-actions">
          <button type="button" className="art-feed-create"><Plus className="h-4 w-4" /> Create</button>
          <button type="button" className="art-feed-icon" aria-label="Activity"><Zap className="h-4 w-4" /></button>
          <button type="button" className="art-feed-avatar" aria-label="Account"><ChevronDown className="h-4 w-4" /></button>
        </div>
      </header>

      <div className="art-feed-grid">
        {loading
          ? Array.from({ length: 15 }).map((_, index) => (
              <div key={index} className="art-feed-skeleton" style={{ aspectRatio: `${[1.2, 0.7, 1.45, 0.9, 1.1][index % 5]}` }} />
            ))
          : items.map((item, index) => (
              <GalleryFeedCard
                key={`${item.id ?? item.url}-${index}`}
                item={item}
                index={index}
                onSelect={onSelect}
              />
            ))}
      </div>
    </section>
  );
}

// ── masonry chunk ──
export function MasonryChunk({
  coord,
  items,
  onSelect,
}: {
  coord: ChunkCoord;
  items: MediaItem[];
  onSelect?: (item: MediaItem) => void;
}) {
  return (
    <div
      className="absolute"
      style={{
        left: coord.cx * GRID_W + (coord.cx >= 0 ? HERO_WIDTH : 0),
        top: HERO_OFFSET + coord.cy * GRID_H,
        width: CHUNK_W,
      }}
    >
      <div className="columns-[180px] md:columns-[200px] gap-4">
        {items.map((item, i) => (
          <MediaCardMemo key={`${coord.cx}x${coord.cy}-${i}`} item={item} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

// ── hero section (ground-level at world origin) ──
export function HeroSection() {
  return (
    <div
      className="absolute rounded-2xl px-10 py-8"
      style={{
        left: 0,
        top: 0,
        width: HERO_WIDTH,
        background: 'hsl(var(--background))',
        border: '1px solid hsl(var(--border) / 0.3)',
      }}
    >
      <p className="font-body text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        Public Domain Gateway
      </p>
      <h1 className="mt-3 font-headline text-4xl md:text-5xl xl:text-6xl leading-[1.08] pointer-events-none select-none">
        Open artwork,
        <br />
        shared knowledge.
      </h1>
      <p className="mt-4 font-body text-sm leading-relaxed text-muted-foreground max-w-md pointer-events-none select-none">
        Explore public-domain and CC0 works from cultural collections, Commons,
        and open archives.
      </p>
      <div className="mt-8 flex items-center gap-2 font-body text-sm text-muted-foreground pointer-events-none select-none">
        <span>Scroll to explore</span>
        <Infinity className="w-4 h-4" />
      </div>
    </div>
  );
}

// ── bottom controls bar ──
export function BottomControls({
  camera,
  wander,
  onToggleWander,
  onResetWander,
  viewMode = 'infinite',
  onViewModeChange,
}: {
  camera: CameraState;
  wander: WanderStats;
  onToggleWander: () => void;
  onResetWander: () => void;
  viewMode?: 'infinite' | 'feed';
  onViewModeChange?: (mode: 'infinite' | 'feed') => void;
}) {
  return (
    <div
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-30 flex items-end justify-center px-3 pb-3 pt-2 sm:items-center sm:px-6 sm:py-3"
    >
      <div
        className="pointer-events-auto flex w-full max-w-4xl flex-col gap-3 rounded-xl px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4"
        style={{
          background: 'hsl(var(--background) / 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid hsl(var(--border) / 0.4)',
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-body text-muted-foreground">
            <Compass className="h-3 w-3" />
            <span className="truncate">{viewMode === 'feed' ? 'Scroll to discover public-domain art' : wander.active ? wander.status : 'Drag or scroll to explore'}</span>
            <span className="hidden opacity-40 sm:inline">/</span>
            <span className="hidden truncate sm:inline">{wander.waypointLabel}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-body sm:mt-2">
            <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-1 text-foreground">
              Discoveries {wander.discoveries}
            </span>
            <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-1 text-foreground">
              Streak {wander.streak}
            </span>
            <span className="hidden rounded-full border border-border/60 bg-muted/40 px-2 py-1 text-muted-foreground sm:inline-flex">
              X {Math.round(camera.x)}
            </span>
            <span className="hidden rounded-full border border-border/60 bg-muted/40 px-2 py-1 text-muted-foreground sm:inline-flex">
              Y {Math.round(camera.y)}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-nowrap sm:items-center sm:gap-1 font-body text-xs bg-transparent sm:bg-muted/60 rounded-md p-0 sm:p-0.5">
          {viewMode === 'infinite' && <button
            type="button"
            onClick={onToggleWander}
            className={`flex items-center justify-center gap-1 rounded-md px-3 py-2 transition sm:rounded-sm sm:py-1 ${
              wander.active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            {wander.active ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            Wander
          </button>}
          {viewMode === 'infinite' && <button
            type="button"
            onClick={onResetWander}
            className="flex items-center justify-center gap-1 rounded-md px-3 py-2 text-muted-foreground transition hover:text-foreground sm:rounded-sm sm:py-1"
          >
            <Sparkles className="w-3 h-3" />
            Reset trail
          </button>}
          <button
            type="button"
            onClick={() => onViewModeChange?.('infinite')}
            className={`flex items-center justify-center gap-1 rounded-md px-3 py-2 sm:rounded-sm sm:py-1 ${viewMode === 'infinite' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            <Infinity className="w-3 h-3" /> Infinite
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange?.('feed')}
            className={`flex items-center justify-center gap-1 rounded-md px-3 py-2 sm:rounded-sm sm:py-1 ${viewMode === 'feed' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            <Grid3x3 className="w-3 h-3" />
            <span className="hidden sm:inline">Feed</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── loading skeleton chunk ──
export function SkeletonChunk({ coord }: { coord: ChunkCoord }) {
  return (
    <div
      className="absolute"
      style={{
        left: coord.cx * GRID_W + (coord.cx >= 0 ? HERO_WIDTH : 0),
        top: HERO_OFFSET + coord.cy * GRID_H,
        width: CHUNK_W,
      }}
    >
      <div className="columns-[180px] gap-4">
        {Array.from({ length: 8 }).map((_, i) => {
          const ratios = [0.75, 1.3, 0.8, 1, 1.1, 0.7, 1.5, 0.9];
          return (
            <div key={i} className="break-inside-avoid mb-4 rounded-lg overflow-hidden bg-card border border-border">
              <div
                className="w-full animate-pulse bg-muted/40"
                style={{ aspectRatio: String(ratios[i]) }}
              />
              <div className="p-3 space-y-2">
                <div className="h-3 w-3/4 rounded-sm animate-pulse bg-muted/30" />
                <div className="h-2 w-1/2 rounded-sm animate-pulse bg-muted/20" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
