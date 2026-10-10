'use client';

import * as React from 'react';
import type { MediaItem } from './types';

// ── image cache with 6hr TTL ──
const IMAGE_CACHE_TTL = 6 * 60 * 60 * 1000;
const imageStateCache = new Map<string, { loaded: boolean; error: boolean }>();
const imageViewportCache = new Map<string, { loaded: boolean; timestamp: number }>();
const preloadPool = new Map<string, HTMLImageElement>();

function isImageCacheValid(url: string): boolean {
  const entry = imageViewportCache.get(url);
  if (!entry) return false;
  return Date.now() - entry.timestamp < IMAGE_CACHE_TTL;
}

function getCachedImageState(url: string): { loaded: boolean; error: boolean } | null {
  if (!isImageCacheValid(url)) {
    imageViewportCache.delete(url);
    return null;
  }
  const state = imageStateCache.get(url);
  return state || null;
}

function setImageCacheState(url: string, loaded: boolean, error: boolean) {
  imageStateCache.set(url, { loaded, error });
  imageViewportCache.set(url, { loaded, timestamp: Date.now() });
}

function preloadImage(url: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  if (preloadPool.has(url)) return preloadPool.get(url)!;
  const img = new Image();
  img.src = url;
  preloadPool.set(url, img);
  return img;
}

function isImageReady(url: string): boolean {
  const cached = getCachedImageState(url);
  if (cached?.loaded) return true;
  const pooled = preloadPool.get(url);
  if (pooled) {
    if (pooled.complete && pooled.naturalWidth > 0) {
      setImageCacheState(url, true, false);
      return true;
    }
    if (pooled.complete && pooled.naturalWidth === 0) {
      setImageCacheState(url, false, true);
      return false;
    }
  }
  return false;
}

function getStableAspectRatio(item: MediaItem): string {
  return item.width > 0 && item.height > 0 ? `${item.width}/${item.height}` : '4 / 3';
}

function cleanExpiredCache() {
  const now = Date.now();
  for (const [url, entry] of imageViewportCache) {
    if (now - entry.timestamp >= IMAGE_CACHE_TTL) {
      imageViewportCache.delete(url);
      imageStateCache.delete(url);
      preloadPool.delete(url);
    }
  }
}

// Clean cache periodically and preload on init
if (typeof window !== 'undefined') {
  setInterval(cleanExpiredCache, 60000);
  try {
    const raw = window.localStorage.getItem('pageos-gallery-feed:v4');
    if (raw) {
      const cache = JSON.parse(raw);
      if (Array.isArray(cache?.chunks)) {
        const urls: string[] = [];
        for (const chunk of cache.chunks) {
          if (Array.isArray(chunk.items)) {
            for (const item of chunk.items) {
              if (item?.url) urls.push(item.url);
            }
          }
        }
        urls.slice(0, 40).forEach(preloadImage);
      }
    }
  } catch { /* storage unavailable */ }
}

export function MediaCard({ item, onSelect }: { item: MediaItem; onSelect?: (item: MediaItem) => void }) {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  const mountedRef = React.useRef(true);
  const retryCount = React.useRef(0);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const tryLoad = React.useCallback(() => {
    if (typeof Image === 'undefined') return;
    // Check preload pool first — if the image is already downloading or done, use it
    const pooled = preloadPool.get(item.url);
    if (pooled) {
      if (pooled.complete && pooled.naturalWidth > 0) {
        if (!mountedRef.current) return;
        setLoaded(true);
        setError(false);
        setImageCacheState(item.url, true, false);
        return;
      }
      if (pooled.complete && pooled.naturalWidth === 0) {
        retryCount.current += 1;
        if (retryCount.current <= 3) {
          setTimeout(tryLoad, 1000 * retryCount.current);
        } else {
          if (!mountedRef.current) return;
          setError(true);
          setImageCacheState(item.url, false, true);
        }
        return;
      }
      // Still loading — poll
      const check = () => {
        if (!mountedRef.current) return;
        if (pooled.complete) {
          if (pooled.naturalWidth > 0) {
            setLoaded(true);
            setError(false);
            setImageCacheState(item.url, true, false);
          } else {
            retryCount.current += 1;
            if (retryCount.current <= 3) {
              setTimeout(tryLoad, 1000 * retryCount.current);
            } else {
              setError(true);
              setImageCacheState(item.url, false, true);
            }
          }
        } else {
          setTimeout(check, 100);
        }
      };
      setTimeout(check, 50);
      return;
    }
    // No pooled image — start a fresh preload
    preloadImage(item.url);
    const img = preloadPool.get(item.url)!;
    const onReady = () => {
      if (!mountedRef.current) return;
      if (img.naturalWidth > 0) {
        setLoaded(true);
        setError(false);
        setImageCacheState(item.url, true, false);
      } else {
        retryCount.current += 1;
        if (retryCount.current <= 3) {
          setTimeout(tryLoad, 1000 * retryCount.current);
        } else {
          setError(true);
          setImageCacheState(item.url, false, true);
        }
      }
    };
    if (img.complete) {
      onReady();
    } else {
      img.addEventListener('load', onReady, { once: true });
      img.addEventListener('error', onReady, { once: true });
    }
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
            style={{
              aspectRatio:
                item.width && item.height && item.width !== item.height
                  ? `${item.width}/${item.height}`
                  : '4/3',
              minHeight: '160px',
            }}
          >
            <span className="text-2xl opacity-25">&#x1F3A8;</span>
          </div>
        ) : (
          <>
            <img
              src={item.url}
              alt={item.title}
              loading="lazy"
              className={`w-full h-auto block ${!loaded ? 'absolute inset-0 opacity-0 pointer-events-none' : ''}`}
              style={{
                opacity: loaded ? 1 : 0,
                transition: 'opacity 0.4s ease',
              }}
              onLoad={() => {
                if (!mountedRef.current) return;
                setLoaded(true);
                setError(false);
                setImageCacheState(item.url, true, false);
              }}
              onError={() => {
                if (!mountedRef.current) return;
                setError(true);
                setImageCacheState(item.url, false, true);
              }}
            />
            {!loaded && (
              <div
                className="w-full animate-pulse bg-muted/30 flex items-center justify-center"
                style={{
                  aspectRatio:
                    item.width && item.height && item.width !== item.height
                      ? `${item.width}/${item.height}`
                      : '4/3',
                  minHeight: '160px',
                }}
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
  isCascade = false,
  dragDistanceRef,
}: {
  item: MediaItem;
  index: number;
  onSelect?: (item: MediaItem) => void;
  isCascade?: boolean;
  dragDistanceRef?: React.MutableRefObject<number>;
}) {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const cardRef = React.useRef<HTMLButtonElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const aspectRatio = getStableAspectRatio(item);

  React.useEffect(() => {
    if (isImageReady(item.url) || (imgRef.current?.complete && imgRef.current.naturalWidth > 0)) {
      setImageLoaded(true);
      setImageCacheState(item.url, true, false);
    }
  }, [item.url]);

  // Warm image for top cards in initial viewport
  React.useEffect(() => {
    if (imageLoaded || imageError || (!isCascade && index >= 16) || (isCascade && index >= 4)) return;
    preloadImage(item.url);
  }, [item.url, imageLoaded, imageError, index, isCascade]);

  const handleError = React.useCallback(() => {
    setImageError(true);
    setImageCacheState(item.url, false, true);
  }, [item.url]);

  const handleLoad = React.useCallback(() => {
    setImageLoaded(true);
    setImageCacheState(item.url, true, false);
  }, [item.url]);

  const handleClick = (e: React.MouseEvent) => {
    if (dragDistanceRef && dragDistanceRef.current > 8) {
      e.preventDefault();
      return;
    }
    onSelect?.(item);
  };

  return (
    <button
      ref={cardRef}
      type="button"
      className={`art-feed-card ${imageLoaded ? 'is-loaded' : ''}`}
      onClick={handleClick}
    >
      {imageError ? (
        <span
          className="art-feed-missing-image"
          aria-label={`${item.title} image unavailable`}
          style={{ aspectRatio }}
        >
          <span>Archive image</span>
        </span>
      ) : (
        <img
          ref={imgRef}
          src={item.url}
          alt={item.title}
          width={item.width}
          height={item.height}
          loading={index < 4 ? 'eager' : 'lazy'}
          fetchPriority={index < 3 ? 'high' : 'auto'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          style={{
            aspectRatio,
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
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
function GalleryFeedViewportOverlay() {
  return <div className="art-feed-viewport-glass art-feed-viewport-glass-top" aria-hidden="true" />;
}

const COL_SPEEDS = [0.82, 1.28, 0.68, 1.14, 0.94];
const COL_INITIAL_OFFSETS = [0, 160, 340, 80, 240];

export function GalleryFeed({
  items,
  loading,
  error,
  hasMore,
  prefetchNext,
  loadNextPage,
  onSelect,
  isDetailOpen = false,
}: {
  items: Array<{ item: MediaItem; key: string }>;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  prefetchNext: () => Promise<unknown>;
  loadNextPage: () => void;
  onSelect?: (item: MediaItem) => void;
  isDetailOpen?: boolean;
}) {
  const isInitialLoading = loading && items.length === 0;

  const [colCount, setColCount] = React.useState(5);

  const viewportRef = React.useRef<HTMLDivElement>(null);
  const trackRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const groupARefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const colHeightsRef = React.useRef<number[]>([]);
  const colDisplacementsRef = React.useRef<number[]>([...COL_INITIAL_OFFSETS]);

  const velocityRef = React.useRef(0);
  const dragVelocityRef = React.useRef(0);

  const isPointerDownRef = React.useRef(false);
  const pointerStartRef = React.useRef({ x: 0, y: 0, lastY: 0 });
  const dragDistanceRef = React.useRef(0);
  const [isDragging, setIsDragging] = React.useState(false);

  // Lock outer document scrolling so the gallery is 100% pinned to the screen
  React.useEffect(() => {
    document.documentElement.classList.add('gallery-autoscroll-locked');
    document.body.classList.add('gallery-autoscroll-locked');
    document.documentElement.classList.remove('gallery-feed-scroll');

    window.scrollTo(0, 0);

    return () => {
      document.documentElement.classList.remove('gallery-autoscroll-locked');
      document.body.classList.remove('gallery-autoscroll-locked');
    };
  }, []);

  React.useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 600) setColCount(2);
      else if (w < 900) setColCount(3);
      else if (w < 1200) setColCount(4);
      else setColCount(5);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Distribute items into columns ensuring no duplicate artworks appear and books are strictly excluded
  const columns = React.useMemo(() => {
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    const uniqueList: Array<{ item: MediaItem; key: string; index: number }> = [];

    items.forEach((entry, idx) => {
      if (entry.item.type === 'book') return; // Exclude books completely from infinite discovery
      const url = entry.item.url?.toLowerCase().trim();
      const title = entry.item.title?.toLowerCase().trim();
      if (url && seenUrls.has(url)) return;
      if (title && seenTitles.has(title)) return;
      if (url) seenUrls.add(url);
      if (title) seenTitles.add(title);
      uniqueList.push({ ...entry, index: idx });
    });

    const cols: Array<Array<{ item: MediaItem; key: string; index: number }>> = Array.from(
      { length: colCount },
      () => []
    );

    uniqueList.forEach((entry, idx) => {
      cols[idx % colCount].push(entry);
    });

    return cols;
  }, [items, colCount]);

  const ensureLoopable = React.useCallback(
    (colItems: Array<{ item: MediaItem; key: string; index: number }>) => {
      if (colItems.length === 0) return [];
      if (colItems.length >= 12) return colItems;
      const res = [...colItems];
      while (res.length < 12) {
        res.push(...colItems);
      }
      return res;
    },
    []
  );

  // Measure each column's Group A height accurately with ResizeObserver
  React.useEffect(() => {
    const ro = new ResizeObserver(() => {
      groupARefs.current.forEach((el, idx) => {
        if (el && el.offsetHeight > 100) {
          colHeightsRef.current[idx] = el.offsetHeight;
        }
      });
    });

    groupARefs.current.forEach((el) => {
      if (el) ro.observe(el);
    });

    return () => ro.disconnect();
  }, [columns]);

  // rAF momentum animation: velocity-driven kinetic inertia with natural friction coasting
  React.useEffect(() => {
    let rafId: number;

    const loop = () => {
      if (isDetailOpen) {
        velocityRef.current = 0;
        rafId = requestAnimationFrame(loop);
        return;
      }

      // Coast with physical inertia when user is not holding pointer down
      if (!isPointerDownRef.current) {
        const friction = 0.946;
        velocityRef.current *= friction;

        if (Math.abs(velocityRef.current) < 0.012) {
          velocityRef.current = 0;
        }

        const deltaY = velocityRef.current;

        if (Math.abs(deltaY) > 0.001) {
          for (let i = 0; i < colCount; i++) {
            const speed = COL_SPEEDS[i % COL_SPEEDS.length];
            colDisplacementsRef.current[i] = (colDisplacementsRef.current[i] || 0) + deltaY * speed;

            const trackEl = trackRefs.current[i];
            if (trackEl) {
              const H = colHeightsRef.current[i] || 3200;
              const wrapped = ((colDisplacementsRef.current[i] % H) + H) % H;
              trackEl.style.transform = `translate3d(0, ${-wrapped}px, 0)`;
            }
          }
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [colCount, isDetailOpen]);

  // Wheel listener: injects velocity impulses with true inertia; unblocked when Details modal is open
  React.useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      // Unblock native scrolling inside the Details modal
      if (isDetailOpen) return;
      const target = e.target as Element | null;
      if (target?.closest?.('.pageos-detail-dialog, .pageos-detail-panel, [role="dialog"], [data-radix-portal]')) {
        return;
      }
      e.preventDefault();

      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 28;

      const abs = Math.abs(dy);
      const impulse = abs >= 40 ? Math.sign(dy) * (8 + (abs - 40) * 0.16) : dy * 0.22;
      velocityRef.current += impulse;
      velocityRef.current = Math.max(-75, Math.min(75, velocityRef.current));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isDetailOpen) return;
      if (['ArrowDown', 'PageDown', 'Space'].includes(e.code)) {
        e.preventDefault();
        velocityRef.current += e.code === 'Space' ? 24 : 14;
      } else if (['ArrowUp', 'PageUp'].includes(e.code)) {
        e.preventDefault();
        velocityRef.current -= 14;
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isDetailOpen]);

  // Pointer drag gestures (mouse grab and touch swipe with kinetic throw inertia)
  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (isDetailOpen) return;
      isPointerDownRef.current = true;
      pointerStartRef.current = { x: e.clientX, y: e.clientY, lastY: e.clientY };
      dragDistanceRef.current = 0;
      dragVelocityRef.current = 0;
      velocityRef.current = 0; // Grab halts inertia
      setIsDragging(true);
    },
    [isDetailOpen]
  );

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!isPointerDownRef.current || isDetailOpen) return;
      const dy = e.clientY - pointerStartRef.current.lastY;
      pointerStartRef.current.lastY = e.clientY;
      dragDistanceRef.current += Math.abs(dy) + Math.abs(e.clientX - pointerStartRef.current.x);

      // Track drag throw velocity
      dragVelocityRef.current = dragVelocityRef.current * 0.4 + dy * 0.6;

      // Move columns directly under cursor
      for (let i = 0; i < colCount; i++) {
        const speed = COL_SPEEDS[i % COL_SPEEDS.length];
        colDisplacementsRef.current[i] = (colDisplacementsRef.current[i] || 0) - dy * speed;

        const trackEl = trackRefs.current[i];
        if (trackEl) {
          const H = colHeightsRef.current[i] || 3200;
          const wrapped = ((colDisplacementsRef.current[i] % H) + H) % H;
          trackEl.style.transform = `translate3d(0, ${-wrapped}px, 0)`;
        }
      }
    },
    [colCount, isDetailOpen]
  );

  const onPointerUp = React.useCallback(() => {
    isPointerDownRef.current = false;
    setIsDragging(false);
    // Kinetic throw into inertia velocity
    if (Math.abs(dragVelocityRef.current) > 1.2) {
      velocityRef.current = -dragVelocityRef.current * 1.35;
      dragVelocityRef.current = 0;
    }
  }, []);

  return (
    <section
      className="art-feed"
      aria-label="Artwork feed"
      style={{
        position: 'relative',
        width: '100%',
        height: '100dvh',
        minHeight: '100dvh',
        overflow: 'hidden',
        background: '#111',
      }}
    >
      <div
        ref={viewportRef}
        className={`art-feed-pinned-viewport ${isDragging ? 'is-dragging' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ width: '100%', height: '100%', minHeight: '100dvh', overflow: 'hidden' }}
      >
        <div className="art-feed-cascade-container">
          {columns.map((colItems, colIdx) => {
            const loopItems = ensureLoopable(colItems);

            return (
              <div
                key={colIdx}
                className="art-cascade-col"
              >
                <div
                  ref={(el) => {
                    trackRefs.current[colIdx] = el;
                  }}
                  className="art-cascade-track"
                >
                  <div
                    ref={(el) => {
                      groupARefs.current[colIdx] = el;
                    }}
                    className="art-cascade-group"
                  >
                    {isInitialLoading
                      ? Array.from({ length: 8 }).map((_, i) => (
                          <div
                            key={`skel-${colIdx}-${i}`}
                            className="art-feed-skeleton"
                            style={{
                              aspectRatio: `${[1.2, 0.7, 1.45, 0.9, 1.1][(colIdx + i) % 5]}`,
                              marginBottom: '1.25rem',
                            }}
                          />
                        ))
                      : loopItems.map(({ item, key, index }, i) => (
                          <GalleryFeedCard
                            key={`a-${colIdx}-${key}-${i}`}
                            item={item}
                            index={index}
                            onSelect={onSelect}
                            isCascade
                            dragDistanceRef={dragDistanceRef}
                          />
                        ))}
                  </div>
                  <div className="art-cascade-group" aria-hidden="true">
                    {!isInitialLoading &&
                      loopItems.map(({ item, key, index }, i) => (
                        <GalleryFeedCard
                          key={`b-${colIdx}-${key}-${i}`}
                          item={item}
                          index={index}
                          onSelect={onSelect}
                          isCascade
                          dragDistanceRef={dragDistanceRef}
                        />
                      ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <GalleryFeedViewportOverlay />
    </section>
  );
}
