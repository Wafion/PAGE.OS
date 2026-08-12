import type { MediaItem } from './types';

export const GALLERY_FEED_CACHE_KEY = 'pageos-gallery-feed:v4';
export const GALLERY_FEED_CACHE_TTL = 6 * 60 * 60 * 1000;
export const GALLERY_FEED_CACHE_VERSION = 4;
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
  return typeof item.url === 'string'
    && typeof item.title === 'string'
    && typeof item.width === 'number'
    && typeof item.height === 'number'
    && (item.type === 'artwork' || item.type === 'book');
}

function normalizeCache(value: unknown): GalleryFeedCache | null {
  if (!value || typeof value !== 'object') return null;
  const cache = value as Partial<GalleryFeedCache>;
  if (cache.version !== GALLERY_FEED_CACHE_VERSION
    || typeof cache.createdAt !== 'number'
    || typeof cache.updatedAt !== 'number'
    || typeof cache.seed !== 'number'
    || !Number.isInteger(cache.cycle) || (cache.cycle ?? -1) < 0
    || !Number.isInteger(cache.nextSourcePage) || (cache.nextSourcePage ?? -1) < 0
    || !Array.isArray(cache.chunks)) return null;

  const seenPages = new Set<number>();
  const chunks: GalleryFeedChunk[] = [];
  for (const chunk of cache.chunks) {
    if (!chunk || typeof chunk.page !== 'number' || !Number.isInteger(chunk.cycle) || chunk.cycle < 0 || typeof chunk.fetchedAt !== 'number' || !Array.isArray(chunk.items)
      || seenPages.has(chunk.page)) continue;
    seenPages.add(chunk.page);
    const seenItems = new Set<string>(chunks
      .filter((existing) => existing.cycle === chunk.cycle)
      .flatMap((existing) => existing.items.map(getMediaItemKey).filter((key): key is string => key !== null)));
    const items = chunk.items.filter(isMediaItem).filter((item) => {
      const key = getMediaItemKey(item);
      if (!key || seenItems.has(key)) return false;
      seenItems.add(key);
      return true;
    });
    if (items.length > 0) chunks.push({ page: chunk.page, cycle: chunk.cycle, items, fetchedAt: chunk.fetchedAt });
  }

  return { ...cache, chunks: chunks.sort((a, b) => a.page - b.page).slice(-MAX_CACHED_CHUNKS) } as GalleryFeedCache;
}

export function readGalleryFeedCache(now = Date.now()): GalleryFeedCache | null {
  try {
    const raw = window.localStorage.getItem(GALLERY_FEED_CACHE_KEY);
    if (!raw) return null;
    const cache = normalizeCache(JSON.parse(raw));
    if (!cache || now - cache.updatedAt >= GALLERY_FEED_CACHE_TTL) {
      window.localStorage.removeItem(GALLERY_FEED_CACHE_KEY);
      return null;
    }
    return cache;
  } catch {
    try { window.localStorage.removeItem(GALLERY_FEED_CACHE_KEY); } catch { /* storage unavailable */ }
    return null;
  }
}

export function writeGalleryFeedCache(cache: GalleryFeedCache): void {
  try {
    window.localStorage.setItem(GALLERY_FEED_CACHE_KEY, JSON.stringify({
      ...cache,
      chunks: cache.chunks.slice(-MAX_CACHED_CHUNKS),
    }));
  } catch {
    // A full or unavailable localStorage must never prevent the network feed from working.
  }
}

export function appendGalleryFeedChunk(cache: GalleryFeedCache, chunk: GalleryFeedChunk, now = Date.now()): GalleryFeedCache {
  if (cache.chunks.some((existing) => existing.page === chunk.page)) return cache;
  const seen = new Set(cache.chunks.filter((existing) => existing.cycle === chunk.cycle).flatMap((existing) => existing.items.map(getMediaItemKey).filter(Boolean)));
  const items = chunk.items.filter((item) => {
    const key = getMediaItemKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { ...cache, updatedAt: now, chunks: [...cache.chunks, { ...chunk, items }].sort((a, b) => a.page - b.page).slice(-MAX_CACHED_CHUNKS) };
}
