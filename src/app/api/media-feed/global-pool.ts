import { promises as fs } from 'fs';
import path from 'path';
import type { MediaItem } from './types';

const CACHE_PATH = path.join(process.cwd(), '.opencode', 'cache', 'global_art_pool.json');

interface CacheData {
  metadata: { lastUpdated: number; hydrationLevel: number };
  seen_urls: string[];
  items: MediaItem[];
}

export class GlobalPool {
  private static instance: GlobalPool;

  private async readCache(): Promise<CacheData> {
    try {
      const content = await fs.readFile(CACHE_PATH, 'utf-8');
      return JSON.parse(content);
    } catch {
      return { metadata: { lastUpdated: 0, hydrationLevel: 0 }, seen_urls: [], items: [] };
    }
  }

  private async writeCache(data: CacheData): Promise<void> {
    await fs.writeFile(CACHE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  }

  static getInstance(): GlobalPool {
    if (!GlobalPool.instance) GlobalPool.instance = new GlobalPool();
    return GlobalPool.instance;
  }

  async getPool(): Promise<MediaItem[]> {
    const cache = await this.readCache();
    return cache.items;
  }

  async addItems(newItems: MediaItem[]): Promise<{ added: number; total: number }> {
    const cache = await this.readCache();
    const unique: MediaItem[] = [];

    for (const item of newItems) {
      if (item.url && !cache.seen_urls.includes(item.url)) {
        cache.seen_urls.push(item.url);
        unique.push(item);
      }
    }

    cache.items.push(...unique);
    cache.metadata.lastUpdated = Date.now();
    cache.metadata.hydrationLevel = cache.items.length;

    await this.writeCache(cache);
    return { added: unique.length, total: cache.items.length };
  }

  async clearCache(): Promise<void> {
    await this.writeCache({ metadata: { lastUpdated: Date.now(), hydrationLevel: 0 }, seen_urls: [], items: [] });
  }

  async getLastUpdated(): Promise<number> {
    const cache = await this.readCache();
    return cache.metadata.lastUpdated;
  }
}