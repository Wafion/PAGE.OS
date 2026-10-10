'use client';

import * as React from 'react';
import type { MediaItem } from './types';
import {
  appendGalleryFeedChunk,
  type GalleryFeedCache,
  GALLERY_FEED_CACHE_VERSION,
  getInitialSeedChunk,
  getMediaItemKey,
  readGalleryFeedCache,
  writeGalleryFeedCache,
} from './gallery-feed-cache';
import { EMBEDDED_ARTWORK_MANIFEST } from '@/lib/data/artwork-manifest';

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
  const chunk0 = getInitialSeedChunk();
  // Include additional baseline chunks from the embedded manifest (90+ items)
  // so each column starts with a large pool of unique artworks on first load.
  const chunk1Items = EMBEDDED_ARTWORK_MANIFEST.slice(20, 55);
  const chunk2Items = EMBEDDED_ARTWORK_MANIFEST.slice(55, 90);
  return {
    version: GALLERY_FEED_CACHE_VERSION,
    createdAt: now,
    updatedAt: now,
    seed: now,
    cycle: 0,
    nextSourcePage: 3,
    chunks: [
      chunk0,
      { page: 1, cycle: 0, items: chunk1Items, fetchedAt: now },
      { page: 2, cycle: 0, items: chunk2Items, fetchedAt: now },
    ],
  };
}

/**
 * Concurrency-conscious image warming.
 * Primes only high-priority visible/upcoming thumbnails to avoid saturating browser network sockets.
 */
function warmImages(items: MediaItem[], limit = 8) {
  if (typeof Image === 'undefined') return;
  items.slice(0, limit).forEach((item) => {
    if (item?.url) {
      const image = new Image();
      image.src = item.url;
    }
  });
}

function warmInitialViewportImages(cache: GalleryFeedCache) {
  if (typeof Image === 'undefined' || !cache.chunks.length) return;
  // Pre-load only the first chunk's top items (the initial visible viewport)
  const firstChunk = cache.chunks[0];
  if (firstChunk?.items) {
    warmImages(firstChunk.items, 12);
  }
}

export function useGalleryFeed(enabled: boolean) {
  const [cache, setCache] = React.useState<GalleryFeedCache | null>(null);
  // Keep the feed in a loading state until the synchronous cache/seed has been
  // attached. This prevents a one-frame empty viewport before the first effect
  // runs on a cold navigation.
  const [loading, setLoading] = React.useState(true);
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
    if (pending && pending.cycle === current.cycle && pending.sourcePage === current.nextSourcePage)
      return pending;
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

        const artworkItems = data.items.filter((item) => item.type === 'artwork' || item.type !== 'book');
        const next: PendingPage = {
          cycle: current.cycle,
          sourcePage: current.nextSourcePage,
          items: artworkItems,
          hasMore: data.hasMore !== false && artworkItems.length > 0,
        };
        pendingRef.current = next;
        // Warm only top 6 upcoming cards so network bandwidth is preserved for current viewport
        warmImages(next.items, 6);
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
    if (
      !pending ||
      pending.cycle !== current.cycle ||
      pending.sourcePage !== current.nextSourcePage
    ) {
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
    commitCache(
      pending.hasMore
        ? { ...next, nextSourcePage: pending.sourcePage + 1 }
        : { ...next, cycle: pending.cycle + 1, nextSourcePage: 0 },
    );
  }, [commitCache, prefetchNext]);

  React.useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (initialized.current) return;
    initialized.current = true;

    // Instant local cache read or instant initial seed chunk
    const existing = readGalleryFeedCache();
    const next = existing && existing.chunks.length > 0 ? existing : createCache();

    cacheRef.current = next;
    setCache(next);

    // Warm initial viewport images with bounded concurrency
    warmInitialViewportImages(next);

    // Kick off progressive discovery in the background
    void revealNext();
  }, [enabled, revealNext]);

  const items = React.useMemo(() => {
    const seenUrls = new Set<string>();
    const result: Array<{ item: MediaItem; key: string }> = [];
    for (const chunk of cache?.chunks ?? []) {
      for (const item of chunk.items) {
        if (item.type === 'book') continue;
        const urlKey = item.url?.toLowerCase().trim();
        if (urlKey && seenUrls.has(urlKey)) continue;
        if (urlKey) seenUrls.add(urlKey);
        result.push({
          item,
          key: `${chunk.cycle}:${getMediaItemKey(item)}`,
        });
      }
    }
    return result;
  }, [cache]);

  return { items, loading, error, hasMore: true, prefetchNext, loadNextPage: revealNext };
}
