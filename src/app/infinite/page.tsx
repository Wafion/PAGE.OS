'use client';

import * as React from 'react';
import type { MediaItem } from './types';
import { useCamera } from './useCamera';
import { useChunkVisibility, useGetChunkItems } from './useChunks';
import { HeroSection, MasonryChunk, BottomControls, SkeletonChunk, GalleryFeed } from './components';
import { MediaDetailDialog } from './detail-dialog';
import { useWander } from './useWander';
import { useGalleryFeed } from './useGalleryFeed';
import { useIsMobile } from '@/hooks/use-mobile';

import { readSpatialPoolCache, writeSpatialPoolCache } from './gallery-feed-cache';
import { EMBEDDED_ARTWORK_MANIFEST } from '@/lib/data/artwork-manifest';

function useMediaFeed() {
  const [items, setItems] = React.useState<MediaItem[]>(() => {
    const cached = readSpatialPoolCache();
    if (cached && cached.length > 0) return cached;
    return EMBEDDED_ARTWORK_MANIFEST.slice(0, 100);
  });
  const [loading, setLoading] = React.useState(false);
  const done = React.useRef(false);

  React.useEffect(() => {
    if (done.current) return;
    done.current = true;
    (async () => {
      try {
        const res = await fetch('/api/media-feed');
        if (!res.ok) return;
        const data: MediaItem[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setItems(data);
          writeSpatialPoolCache(data);
        }
      } catch (err) {
        console.warn('Background spatial pool refresh failed, preserving cache:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { items, loading };
}

export default function InfinitePage() {
  const isMobile = useIsMobile();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = React.useState({ w: 0, h: 0 });
  const [selectedItem, setSelectedItem] = React.useState<MediaItem | null>(null);
  const [wanderEnabled, setWanderEnabled] = React.useState(true);
  const [wanderPaused, setWanderPaused] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'infinite' | 'feed'>('infinite');
  const centered = React.useRef(false);

  // When a mobile user visits, lock the mode to gallery view ('feed')
  React.useEffect(() => {
    if (isMobile) {
      setViewMode('feed');
    }
  }, [isMobile]);

  const effectiveViewMode = isMobile ? 'feed' : viewMode;

  const { camera, onPointerDown, onPointerMove, onPointerUp, setPosition, setCameraState, lastInteractionAt } = useCamera(containerRef, effectiveViewMode === 'infinite');
  const { items, loading } = useMediaFeed();
  const galleryFeed = useGalleryFeed(effectiveViewMode === 'feed');
  const visibleChunks = useChunkVisibility(camera, viewportSize.w, viewportSize.h);
  const getChunkItems = useGetChunkItems(items);

  const returnToInfinite = React.useCallback(() => {
    if (isMobile) return;
    // Feed mode uses document scrolling; return the spatial canvas to the same viewport origin as a direct visit.
    window.scrollTo(0, 0);
    setViewMode('infinite');
    window.requestAnimationFrame(() => window.scrollTo(0, 0));
  }, [isMobile]);

  React.useEffect(() => {
    if (!wanderEnabled || effectiveViewMode !== 'infinite') {
      setWanderPaused(false);
      return;
    }

    const elapsed = Date.now() - lastInteractionAt;
    if (elapsed < 2400) {
      setWanderPaused(true);
      const timeout = window.setTimeout(() => {
        setWanderPaused(false);
      }, 2500 - elapsed);
      return () => window.clearTimeout(timeout);
    }

    setWanderPaused(false);
  }, [lastInteractionAt, wanderEnabled, effectiveViewMode]);

  React.useEffect(() => {
    if (!selectedItem || !wanderEnabled || effectiveViewMode !== 'infinite') return;
    setWanderPaused(true);
  }, [selectedItem, wanderEnabled, effectiveViewMode]);

  const { stats: wanderStats, resetProgress } = useWander({
    enabled: wanderEnabled && effectiveViewMode === 'infinite',
    paused: wanderPaused || selectedItem !== null || effectiveViewMode !== 'infinite',
    camera,
    viewportW: viewportSize.w,
    viewportH: viewportSize.h,
    onCameraChange: setCameraState,
  });

  React.useEffect(() => {
    if (effectiveViewMode !== 'infinite') return;
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        setViewportSize({ w, h });
        if (!centered.current && w > 0 && h > 0) {
          centered.current = true;
          setPosition(Math.round(320 - w / 2), Math.round(175 - h / 2));
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [setPosition, effectiveViewMode]);

  return (
    <div className={`flex-1 flex flex-col min-h-0${effectiveViewMode === 'feed' ? ' art-feed-page' : ' min-h-[calc(100dvh-3.5rem)]'}`} style={{ background: effectiveViewMode === 'feed' ? '#111111' : 'hsl(var(--background))' }}>
      {effectiveViewMode === 'feed' ? (
        <GalleryFeed
          {...galleryFeed}
          onSelect={setSelectedItem}
          onReturnToInfinite={isMobile ? undefined : returnToInfinite}
        />
      ) : (
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden select-none"
          style={{ touchAction: 'none', cursor: 'grab', position: 'relative' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {/* world */}
          <div
            style={{
              position: 'relative',
              width: 0,
              height: 0,
              transformOrigin: '0 0',
              transform: `scale(${camera.zoom}) translate(${-camera.x}px, ${-camera.y}px)`,
              willChange: 'transform',
            }}
          >
            <HeroSection />

          {loading
            ? visibleChunks.slice(0, 6).map((c) => (
                <SkeletonChunk key={`skel-${c.cx},${c.cy}`} coord={c} />
              ))
            : visibleChunks.length > 0 && items.length > 0 &&
              visibleChunks.map((c) => {
                const chunkItems = getChunkItems(c.cx, c.cy);
                return (
                  <MasonryChunk
                    key={`${c.cx},${c.cy}`}
                    coord={c}
                    items={chunkItems}
                    onSelect={setSelectedItem}
                  />
                );
              })}

            {!loading && items.length === 0 && (
              <div className="absolute px-10" style={{ left: 0, top: 240 }}>
                <p className="text-sm text-muted-foreground">No media available. Try again later.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {effectiveViewMode === 'infinite' && !isMobile && <BottomControls
        camera={camera}
        wander={wanderStats}
        onToggleWander={() => {
          setWanderEnabled((prev) => !prev);
          setWanderPaused(false);
        }}
        onResetWander={resetProgress}
        viewMode={effectiveViewMode}
        onViewModeChange={(mode) => {
          if (isMobile && mode === 'infinite') return;
          setViewMode(mode);
        }}
        isMobile={isMobile}
      />}
      <MediaDetailDialog
        item={selectedItem}
        open={selectedItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null);
            if (wanderEnabled && effectiveViewMode === 'infinite') {
              window.setTimeout(() => setWanderPaused(false), 250);
            }
          }
        }}
      />
    </div>
  );
}
