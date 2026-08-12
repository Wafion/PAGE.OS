'use client';

import * as React from 'react';
import type { MediaItem } from './types';
import {
  appendGalleryFeedChunk,
  type GalleryFeedCache,
  getMediaItemKey,
  readGalleryFeedCache,
  writeGalleryFeedCache,
} from './gallery-feed-cache';

interface FeedResponse {
  items?: MediaItem[];
  hasMore?: boolean;
}

interface PendingPage {
  cycle: number;
  sourcePage: number;
  items: MediaItem[];
  hasMore: boolean;
}

function createCache(): GalleryFeedCache {
  const now = Date.now();
  return { version: 4, createdAt: now, updatedAt: now, seed: now, cycle: 0, nextSourcePage: 0, chunks: [] };
}

function warmImages(items: MediaItem[]) {
  if (typeof Image === 'undefined') return;
  // Keep the warm-up deliberately small: one upcoming row, not the full feed page.
  items.slice(0, 8).forEach((item) => { const image = new Image(); image.src = item.url; });
}

export function useGalleryFeed(enabled: boolean) {
  const [cache, setCache] = React.useState<GalleryFeedCache | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const initialized = React.useRef(false);
  const cacheRef = React.useRef<GalleryFeedCache | null>(null);
  const pendingRef = React.useRef<PendingPage | null>(null);
  const inFlightRef = React.useRef<Promise<PendingPage | null> | null>(null);

  const commitCache = React.useCallback((next: GalleryFeedCache) => {
    cacheRef.current = next;
    setCache(next);
    writeGalleryFeedCache(next);
  }, []);

  const prefetchNext = React.useCallback(async (): Promise<PendingPage | null> => {
    const current = cacheRef.current;
    if (!current) return null;
    const pending = pendingRef.current;
    if (pending && pending.cycle === current.cycle && pending.sourcePage === current.nextSourcePage) return pending;
    if (inFlightRef.current) return inFlightRef.current;

    setLoading(true);
    setError(null);
    const request = (async () => {
      try {
        const params = new URLSearchParams({
          feed: '1',
          seed: String(current.seed + current.cycle * 104729),
          page: String(current.nextSourcePage),
          limit: '30',
        });
        const response = await fetch(`/api/media-feed?${params}`);
        if (!response.ok) throw new Error('Unable to load more artwork.');
        const data: FeedResponse = await response.json();
        if (!Array.isArray(data.items)) throw new Error('The artwork response was invalid.');

        const next: PendingPage = {
          cycle: current.cycle,
          sourcePage: current.nextSourcePage,
          items: data.items,
          hasMore: data.hasMore !== false && data.items.length > 0,
        };
        pendingRef.current = next;
        warmImages(next.items);
        return next;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load more artwork.');
        return null;
      } finally {
        inFlightRef.current = null;
        setLoading(false);
      }
    })();
    inFlightRef.current = request;
    return request;
  }, []);

  const revealNext = React.useCallback(async () => {
    const current = cacheRef.current;
    if (!current) return;
    let pending = pendingRef.current;
    if (!pending || pending.cycle !== current.cycle || pending.sourcePage !== current.nextSourcePage) {
      pending = await prefetchNext();
    }
    if (!pending) return;

    pendingRef.current = null;
    const latest = cacheRef.current ?? current;
    const next = appendGalleryFeedChunk(latest, {
      page: (latest.chunks.at(-1)?.page ?? -1) + 1,
      cycle: pending.cycle,
      items: pending.items,
      fetchedAt: Date.now(),
    });
    commitCache(pending.hasMore
      ? { ...next, nextSourcePage: pending.sourcePage + 1 }
      : { ...next, cycle: pending.cycle + 1, nextSourcePage: 0 });
  }, [commitCache, prefetchNext]);

  React.useEffect(() => {
    if (!enabled || initialized.current) return;
    initialized.current = true;
    const next = readGalleryFeedCache() ?? createCache();
    cacheRef.current = next;
    setCache(next);
    // Fill the first visual page. Every later page is staged ahead of the viewport.
    void revealNext();
  }, [enabled, revealNext]);

  const items = React.useMemo(() => (cache?.chunks ?? []).flatMap((chunk) => chunk.items.map((item) => ({
    item,
    key: `${chunk.cycle}:${getMediaItemKey(item)}`,
  }))), [cache]);

  return { items, loading, error, hasMore: true, prefetchNext, loadNextPage: revealNext };
}
