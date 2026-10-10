import type { MediaItem } from './types';
import { EMBEDDED_ARTWORK_MANIFEST } from '@/lib/data/artwork-manifest';

export const GALLERY_FEED_CACHE_KEY = 'pageos-gallery-feed:v5';
export const GALLERY_FEED_CACHE_LEGACY_KEY = 'pageos-gallery-feed:v4';
export const SPATIAL_POOL_CACHE_KEY = 'pageos-spatial-feed:v2';
export const GALLERY_FEED_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
export const GALLERY_FEED_CACHE_VERSION = 5;
const MAX_CACHED_CHUNKS = 24;

export interface GalleryFeedChunk {
  page: number;
  cycle: number;
  items: MediaItem[];
  fetchedAt: number;
}

export interface GalleryFeedCache {
  version: number;
  createdAt: number;
  updatedAt: number;
  seed: number;
  cycle: number;
  nextSourcePage: number;
  chunks: GalleryFeedChunk[];
}

export function getMediaItemKey(item: MediaItem): string | null {
  return item.sourceRecordId || item.id || item.sourceUrl || item.url || null;
}

function isMediaItem(value: unknown): value is MediaItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<MediaItem>;
  return (
    typeof item.url === 'string' &&
    typeof item.title === 'string' &&
    typeof item.width === 'number' &&
    typeof item.height === 'number' &&
    (item.type === 'artwork' || item.type === 'book')
  );
}

function normalizeCache(value: unknown): GalleryFeedCache | null {
  if (!value || typeof value !== 'object') return null;
  const cache = value as Partial<GalleryFeedCache>;
  if (
    (cache.version !== GALLERY_FEED_CACHE_VERSION && cache.version !== 4) ||
    typeof cache.createdAt !== 'number' ||
    typeof cache.updatedAt !== 'number' ||
    typeof cache.seed !== 'number' ||
    !Number.isInteger(cache.cycle) ||
    (cache.cycle ?? -1) < 0 ||
    !Number.isInteger(cache.nextSourcePage) ||
    (cache.nextSourcePage ?? -1) < 0 ||
    !Array.isArray(cache.chunks)
  )
    return null;

  const seenPages = new Set<number>();
  const chunks: GalleryFeedChunk[] = [];
  for (const chunk of cache.chunks) {
    if (
      !chunk ||
      typeof chunk.page !== 'number' ||
      !Number.isInteger(chunk.cycle) ||
      chunk.cycle < 0 ||
      typeof chunk.fetchedAt !== 'number' ||
      !Array.isArray(chunk.items) ||
      seenPages.has(chunk.page)
    )
      continue;
    seenPages.add(chunk.page);
    const seenItems = new Set<string>(
      chunks
        .filter((existing) => existing.cycle === chunk.cycle)
        .flatMap((existing) =>
          existing.items.map(getMediaItemKey).filter((key): key is string => key !== null),
        ),
    );
    const items = chunk.items.filter(isMediaItem).filter((item) => {
      const key = getMediaItemKey(item);
      if (!key || seenItems.has(key)) return false;
      seenItems.add(key);
      return true;
    });
    if (items.length > 0)
      chunks.push({ page: chunk.page, cycle: chunk.cycle, items, fetchedAt: chunk.fetchedAt });
  }

  return {
    ...cache,
    version: GALLERY_FEED_CACHE_VERSION,
    chunks: chunks.sort((a, b) => a.page - b.page).slice(-MAX_CACHED_CHUNKS),
  } as GalleryFeedCache;
}

export function readGalleryFeedCache(now = Date.now()): GalleryFeedCache | null {
  if (typeof window === 'undefined') return null;
  try {
    let raw = window.localStorage.getItem(GALLERY_FEED_CACHE_KEY);
    if (!raw) {
      // Attempt migrating legacy v4 cache if available
      raw = window.localStorage.getItem(GALLERY_FEED_CACHE_LEGACY_KEY);
    }
    if (!raw) return null;
    const cache = normalizeCache(JSON.parse(raw));
    if (!cache || now - cache.updatedAt >= GALLERY_FEED_CACHE_TTL) {
      window.localStorage.removeItem(GALLERY_FEED_CACHE_KEY);
      window.localStorage.removeItem(GALLERY_FEED_CACHE_LEGACY_KEY);
      return null;
    }
    return cache;
  } catch {
    try {
      window.localStorage.removeItem(GALLERY_FEED_CACHE_KEY);
    } catch {
      /* storage unavailable */
    }
    return null;
  }
}

export function writeGalleryFeedCache(cache: GalleryFeedCache): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      GALLERY_FEED_CACHE_KEY,
      JSON.stringify({
        ...cache,
        version: GALLERY_FEED_CACHE_VERSION,
        chunks: cache.chunks.slice(-MAX_CACHED_CHUNKS),
      }),
    );
  } catch {
    // A full or unavailable localStorage must never prevent the network feed from working.
  }
}

export function appendGalleryFeedChunk(
  cache: GalleryFeedCache,
  chunk: GalleryFeedChunk,
  now = Date.now(),
): GalleryFeedCache {
  if (cache.chunks.some((existing) => existing.page === chunk.page)) return cache;
  const seen = new Set(
    cache.chunks
      .filter((existing) => existing.cycle === chunk.cycle)
      .flatMap((existing) => existing.items.map(getMediaItemKey).filter(Boolean)),
  );
  const seenUrls = new Set(
    cache.chunks
      .flatMap((existing) => existing.items.map((it) => it.url?.toLowerCase().trim()).filter(Boolean)),
  );
  const items = chunk.items.filter((item) => {
    const key = getMediaItemKey(item);
    const url = item.url?.toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    if (url && seenUrls.has(url)) return false;
    seen.add(key);
    if (url) seenUrls.add(url);
    return true;
  });
  return {
    ...cache,
    updatedAt: now,
    chunks: [...cache.chunks, { ...chunk, items }]
      .sort((a, b) => a.page - b.page)
      .slice(-MAX_CACHED_CHUNKS),
  };
}

/**
 * Returns a small instant seed chunk from embedded manifest for first-time visitors
 * so artwork is visible immediately while the network request resolves in background.
 */
export function getInitialSeedChunk(): GalleryFeedChunk {
  const seedItems = EMBEDDED_ARTWORK_MANIFEST.slice(0, 20);
  return {
    page: 0,
    cycle: 0,
    items: seedItems,
    fetchedAt: Date.now(),
  };
}

/**
 * Spatial canvas pool caching: stores the last known pool of artworks in localStorage
 * so that returning to spatial mode instantly renders masonry chunks.
 */
export function readSpatialPoolCache(): MediaItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SPATIAL_POOL_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.items) && parsed.items.length > 0) {
      if (Date.now() - (parsed.savedAt || 0) < GALLERY_FEED_CACHE_TTL) {
        return parsed.items.filter(isMediaItem);
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function writeSpatialPoolCache(items: MediaItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      SPATIAL_POOL_CACHE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        items: items.slice(0, 150),
      }),
    );
  } catch {
    /* storage unavailable */
  }
}
