import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { MediaItem } from './types';
import { EMBEDDED_ARTWORK_MANIFEST } from '@/lib/data/artwork-manifest';

const LOCAL_CACHE_PATH = path.join(process.cwd(), '.opencode', 'cache', 'global_art_pool.json');
const TMP_CACHE_PATH = path.join(os.tmpdir(), 'pageos_cache', 'global_art_pool.json');

export interface CacheMetadata {
  lastUpdated: number;
  hydrationLevel: number;
  lastSourceRefresh?: Record<string, number>;
  sourceCounts?: Record<string, number>;
}

export interface CacheData {
  metadata: CacheMetadata;
  seen_urls: string[];
  items: MediaItem[];
}

declare global {
  // eslint-disable-next-line no-var
  var __pageos_art_pool_cache__: CacheData | undefined;
}

function normalizeItem(item: MediaItem, index: number): MediaItem {
  const source = item.source || 'archive';
  const width = typeof item.width === 'number' ? item.width : (parseInt(String(item.width), 10) || 600);
  const height = typeof item.height === 'number' ? item.height : (parseInt(String(item.height), 10) || 600);
  const id = item.id || item.sourceRecordId || `${source}-${index}-${encodeURIComponent(item.title || 'work')}`;

  return {
    ...item,
    id,
    sourceRecordId: item.sourceRecordId || id,
    width,
    height,
    source,
    type: item.type || 'artwork',
    rightsLabel: item.rightsLabel || (source === 'cleveland' ? 'CC0' : 'Public Domain'),
  };
}

function computeSourceCounts(items: MediaItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const s = item.source || 'unknown';
    counts[s] = (counts[s] || 0) + 1;
  }
  return counts;
}

// Shared Data Cache persistence across Vercel serverless instances within the deployment
let sharedPoolFetcher: (() => Promise<MediaItem[]>) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { unstable_cache } = require('next/cache');
  if (typeof unstable_cache === 'function') {
    sharedPoolFetcher = unstable_cache(
      async () => {
        const instance = GlobalPool.getInstance();
        return await instance.getDirectPool();
      },
      ['pageos-shared-art-pool-v1'],
      {
        tags: ['pageos-art-pool'],
        revalidate: 86400, // 24 hours
      }
    );
  }
} catch {
  sharedPoolFetcher = null;
}

export class GlobalPool {
  private static instance: GlobalPool;

  private async readFromDisk(filePath: string): Promise<CacheData | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content) as Partial<CacheData>;
      if (Array.isArray(parsed.items) && parsed.items.length > 0) {
        return {
          metadata: parsed.metadata || { lastUpdated: Date.now(), hydrationLevel: parsed.items.length },
          seen_urls: Array.isArray(parsed.seen_urls) ? parsed.seen_urls : [],
          items: parsed.items.map(normalizeItem),
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private async readCache(): Promise<CacheData> {
    // 1. Hot memory cache
    if (globalThis.__pageos_art_pool_cache__ && globalThis.__pageos_art_pool_cache__.items.length > 0) {
      return globalThis.__pageos_art_pool_cache__;
    }

    // 2. Local disk cache (development / container)
    let diskData = await this.readFromDisk(LOCAL_CACHE_PATH);

    // 3. Serverless temp cache
    if (!diskData) {
      diskData = await this.readFromDisk(TMP_CACHE_PATH);
    }

    if (diskData && diskData.items.length > 0) {
      diskData.metadata.sourceCounts = computeSourceCounts(diskData.items);
      globalThis.__pageos_art_pool_cache__ = diskData;
      return diskData;
    }

    // 4. Optional shared upstream pool synchronization (e.g. Render background worker or shared storage)
    if (process.env.UPSTREAM_POOL_URL) {
      try {
        const res = await fetch(process.env.UPSTREAM_POOL_URL, {
          signal: AbortSignal.timeout(1200),
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          const remote = (await res.json()) as { items?: MediaItem[]; lastUpdated?: number };
          const remoteItems = Array.isArray(remote?.items)
            ? remote.items
            : Array.isArray(remote)
              ? (remote as MediaItem[])
              : null;
          if (remoteItems && remoteItems.length > 0) {
            const normalized = remoteItems.map(normalizeItem);
            const remoteData: CacheData = {
              metadata: {
                lastUpdated: remote.lastUpdated || Date.now(),
                hydrationLevel: normalized.length,
                sourceCounts: computeSourceCounts(normalized),
              },
              seen_urls: normalized.map((i) => i.url).filter(Boolean),
              items: normalized,
            };
            globalThis.__pageos_art_pool_cache__ = remoteData;
            return remoteData;
          }
        }
      } catch {
        // Non-blocking fallback: worker unavailable/asleep, proceed to embedded baseline
      }
    }

    // 5. Guaranteed embedded baseline (resilient cold start)
    const normalizedBaseline = EMBEDDED_ARTWORK_MANIFEST.map(normalizeItem);
    const seenUrls = normalizedBaseline.map((item) => item.url).filter(Boolean);

    const initialCache: CacheData = {
      metadata: {
        lastUpdated: Date.now(),
        hydrationLevel: normalizedBaseline.length,
        sourceCounts: computeSourceCounts(normalizedBaseline),
      },
      seen_urls: seenUrls,
      items: normalizedBaseline,
    };

    globalThis.__pageos_art_pool_cache__ = initialCache;
    return initialCache;
  }

  private async writeCache(data: CacheData): Promise<void> {
    // Always update hot memory
    globalThis.__pageos_art_pool_cache__ = data;

    // Best-effort write to local path and temp path
    const targets = [LOCAL_CACHE_PATH, TMP_CACHE_PATH];
    for (const target of targets) {
      try {
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, JSON.stringify(data, null, 2), 'utf-8');
        break; // Successfully written to disk
      } catch {
        // Silently continue to next target (e.g. read-only filesystem)
      }
    }
  }

  static getInstance(): GlobalPool {
    if (!GlobalPool.instance) GlobalPool.instance = new GlobalPool();
    return GlobalPool.instance;
  }

  async getDirectPool(): Promise<MediaItem[]> {
    const cache = await this.readCache();
    return cache.items;
  }

  async getPool(): Promise<MediaItem[]> {
    if (sharedPoolFetcher) {
      try {
        const shared = await sharedPoolFetcher();
        if (Array.isArray(shared) && shared.length > 0) {
          return shared;
        }
      } catch {
        // Outside Next.js request context or incrementalCache unavailable
      }
    }
    const cache = await this.readCache();
    return cache.items;
  }

  async addItems(newItems: MediaItem[]): Promise<{ added: number; total: number }> {
    const cache = await this.readCache();
    const seenKeys = new Set(
      cache.items.map((item) => item.sourceRecordId || item.id || item.sourceUrl || item.url).filter(Boolean),
    );
    const unique: MediaItem[] = [];

    for (const rawItem of newItems) {
      const item = normalizeItem(rawItem, cache.items.length + unique.length);
      const uniqueKey = item.sourceRecordId || item.id || item.sourceUrl || item.url;
      if (item.url && uniqueKey && !seenKeys.has(uniqueKey) && !cache.seen_urls.includes(item.url)) {
        seenKeys.add(uniqueKey);
        cache.seen_urls.push(item.url);
        unique.push(item);
      }
    }

    if (unique.length > 0) {
      cache.items.push(...unique);
      cache.metadata.lastUpdated = Date.now();
      cache.metadata.hydrationLevel = cache.items.length;
      cache.metadata.sourceCounts = computeSourceCounts(cache.items);
      await this.writeCache(cache);

      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { revalidateTag } = require('next/cache');
        if (typeof revalidateTag === 'function') {
          revalidateTag('pageos-art-pool');
        }
      } catch {
        // Ignored outside Next.js request context
      }
    }

    return { added: unique.length, total: cache.items.length };
  }

  async clearCache(): Promise<void> {
    const baseline = EMBEDDED_ARTWORK_MANIFEST.map(normalizeItem);
    const resetCache: CacheData = {
      metadata: {
        lastUpdated: Date.now(),
        hydrationLevel: baseline.length,
        sourceCounts: computeSourceCounts(baseline),
      },
      seen_urls: baseline.map((i) => i.url),
      items: baseline,
    };
    await this.writeCache(resetCache);
  }

  async getLastUpdated(): Promise<number> {
    const cache = await this.readCache();
    return cache.metadata.lastUpdated;
  }

  async getMetadata(): Promise<CacheMetadata> {
    const cache = await this.readCache();
    return cache.metadata;
  }
}
