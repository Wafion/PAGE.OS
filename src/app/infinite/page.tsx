'use client';

import * as React from 'react';
import type { MediaItem } from './types';
import { useCamera } from './useCamera';
import { useChunkVisibility, useGetChunkItems } from './useChunks';
import { HeroSection, MasonryChunk, BottomControls, SkeletonChunk } from './components';

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
  const centered = React.useRef(false);

  const { camera, onPointerDown, onPointerMove, onPointerUp, setPosition } = useCamera(containerRef);
  const { items, loading } = useMediaFeed();
  const visibleChunks = useChunkVisibility(camera, viewportSize.w, viewportSize.h);
  const getChunkItems = useGetChunkItems(items);

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
    <div className="flex-1 flex flex-col min-h-0" style={{ background: 'hsl(var(--background))' }}>
        {/* viewport */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden select-none"
        style={{ touchAction: 'none', cursor: 'grab', position: 'relative' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
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

      <BottomControls camera={camera} />
    </div>
  );
}