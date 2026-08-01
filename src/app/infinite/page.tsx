'use client';

import * as React from 'react';
import type { MediaItem } from './types';
import { useCamera } from './useCamera';
import { useChunkVisibility, useGetChunkItems } from './useChunks';
import { HeroSection, MasonryChunk, BottomControls, SkeletonChunk, GalleryFeed } from './components';
import { MediaDetailDialog } from './detail-dialog';
import { useWander } from './useWander';

function useMediaFeed() {
  const [items, setItems] = React.useState<MediaItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const done = React.useRef(false);

  React.useEffect(() => {
    if (done.current) return;
    done.current = true;
    (async () => {
      try {
        const res = await fetch('/api/media-feed');
        const data: MediaItem[] = await res.json();
        if (Array.isArray(data) && data.length > 0) setItems(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { items, loading };
}

export default function InfinitePage() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = React.useState({ w: 0, h: 0 });
  const [selectedItem, setSelectedItem] = React.useState<MediaItem | null>(null);
  const [wanderEnabled, setWanderEnabled] = React.useState(true);
  const [wanderPaused, setWanderPaused] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'infinite' | 'feed'>('infinite');
  const centered = React.useRef(false);

  const { camera, onPointerDown, onPointerMove, onPointerUp, setPosition, setCameraState, lastInteractionAt } = useCamera(containerRef);
  const { items, loading } = useMediaFeed();
  const visibleChunks = useChunkVisibility(camera, viewportSize.w, viewportSize.h);
  const getChunkItems = useGetChunkItems(items);

  React.useEffect(() => {
    if (!wanderEnabled) {
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
  }, [lastInteractionAt, wanderEnabled]);

  React.useEffect(() => {
    if (!selectedItem || !wanderEnabled) return;
    setWanderPaused(true);
  }, [selectedItem, wanderEnabled]);

  const { stats: wanderStats, resetProgress } = useWander({
    enabled: wanderEnabled,
    paused: wanderPaused || selectedItem !== null,
    camera,
    viewportW: viewportSize.w,
    viewportH: viewportSize.h,
    onCameraChange: setCameraState,
  });

  React.useEffect(() => {
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
  }, [setPosition]);

  return (
    <div className={`flex-1 flex flex-col min-h-0${viewMode === 'feed' ? ' art-feed-page' : ''}`} style={{ background: viewMode === 'feed' ? '#111111' : 'hsl(var(--background))' }}>
      {viewMode === 'feed' ? (
        <GalleryFeed items={items} loading={loading} onSelect={setSelectedItem} />
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

      <BottomControls
        camera={camera}
        wander={wanderStats}
        onToggleWander={() => {
          setWanderEnabled((prev) => !prev);
          setWanderPaused(false);
        }}
        onResetWander={resetProgress}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      <MediaDetailDialog
        item={selectedItem}
        open={selectedItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null);
            if (wanderEnabled) {
              window.setTimeout(() => setWanderPaused(false), 250);
            }
          }
        }}
      />
    </div>
  );
}
