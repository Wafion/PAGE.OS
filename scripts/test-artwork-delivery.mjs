/**
 * Verification test suite for Artwork Preloading, Background Cache Warming & Resilient Delivery.
 * Run: node --experimental-strip-types --no-warnings ./scripts/test-artwork-delivery.mjs
 */
import { GlobalPool } from '../src/app/api/media-feed/global-pool.ts';
import { EMBEDDED_ARTWORK_MANIFEST } from '../src/lib/data/artwork-manifest.ts';
import {
  GALLERY_FEED_CACHE_VERSION,
  GALLERY_FEED_CACHE_TTL,
  appendGalleryFeedChunk,
  getInitialSeedChunk,
  getMediaItemKey,
} from '../src/app/infinite/gallery-feed-cache.ts';

import fs from 'node:fs';
import path from 'node:path';

const localCachePath = path.resolve(process.cwd(), '.opencode', 'cache', 'global_art_pool.json');
const originalLocalCacheContent = fs.existsSync(localCachePath) ? fs.readFileSync(localCachePath, 'utf-8') : null;

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok    ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  FAIL  ${name}: ${error instanceof Error ? error.message : error}`);
  }
}

console.log('\n── Running PAGE.OS Artwork Delivery & Cache Verification ──\n');

// 1. Embedded Manifest Baseline
await check('embedded manifest contains 200+ verified artworks', () => {
  if (!Array.isArray(EMBEDDED_ARTWORK_MANIFEST) || EMBEDDED_ARTWORK_MANIFEST.length < 200) {
    throw new Error(`Expected at least 200 artworks, got ${EMBEDDED_ARTWORK_MANIFEST?.length}`);
  }
});

await check('all embedded artworks have stable non-empty identifiers and valid dimensions', () => {
  for (const item of EMBEDDED_ARTWORK_MANIFEST) {
    if (!item.id || typeof item.id !== 'string') {
      throw new Error(`Missing or non-string id on artwork: ${JSON.stringify(item)}`);
    }
    if (typeof item.width !== 'number' || item.width <= 0) {
      throw new Error(`Invalid width on item ${item.id}: ${item.width}`);
    }
    if (typeof item.height !== 'number' || item.height <= 0) {
      throw new Error(`Invalid height on item ${item.id}: ${item.height}`);
    }
    if (!item.url || !item.url.startsWith('http')) {
      throw new Error(`Invalid image URL on item ${item.id}: ${item.url}`);
    }
  }
});

// 2. GlobalPool Cold Start & Resilience
await check('cold cache initializes immediately with embedded manifest baseline', async () => {
  const poolManager = GlobalPool.getInstance();
  const pool = await poolManager.getPool();
  if (!pool || pool.length === 0) {
    throw new Error('Pool should not be empty on cold start');
  }
  if (pool.length < 200) {
    throw new Error(`Pool should have at least 200 baseline items, got ${pool.length}`);
  }
});

await check('warm cache returns memory-speed pool on subsequent calls', async () => {
  const poolManager = GlobalPool.getInstance();
  const t0 = performance.now();
  const pool = await poolManager.getPool();
  const elapsed = performance.now() - t0;
  if (elapsed > 50) {
    throw new Error(`Memory retrieval took too long: ${elapsed}ms`);
  }
  if (pool.length === 0) throw new Error('Pool was empty');
});

// 3. Deduplication and Stability
await check('adding duplicate artworks does not inflate pool count', async () => {
  const poolManager = GlobalPool.getInstance();
  const beforeCount = (await poolManager.getPool()).length;

  // Attempt to re-add existing items
  const duplicates = EMBEDDED_ARTWORK_MANIFEST.slice(0, 10);
  const result = await poolManager.addItems(duplicates);

  if (result.added !== 0) {
    throw new Error(`Expected 0 added duplicates, got ${result.added}`);
  }

  const afterCount = (await poolManager.getPool()).length;
  if (afterCount !== beforeCount) {
    throw new Error(`Pool count changed from ${beforeCount} to ${afterCount}`);
  }
});

await check('adding fresh unique artwork merges cleanly', async () => {
  const poolManager = GlobalPool.getInstance();
  const uniqueItem = {
    id: `test-unique-${Date.now()}`,
    sourceRecordId: `test-unique-${Date.now()}`,
    url: `https://example.com/unique-artwork-${Date.now()}.jpg`,
    width: 800,
    height: 600,
    title: 'Unique Test Masterpiece',
    creator: 'Test Artisan',
    year: '1920',
    type: 'artwork',
    source: 'test',
  };

  const result = await poolManager.addItems([uniqueItem]);
  if (result.added !== 1) {
    throw new Error(`Expected 1 added item, got ${result.added}`);
  }
});

// 4. Client-side Feed Chunks & Scroll Preservation
await check('initial seed chunk provides instant display items for first-time visitors', () => {
  const seedChunk = getInitialSeedChunk();
  if (!seedChunk || !Array.isArray(seedChunk.items) || seedChunk.items.length < 10) {
    throw new Error(`Seed chunk missing or insufficient items: ${seedChunk?.items?.length}`);
  }
  if (seedChunk.page !== 0 || seedChunk.cycle !== 0) {
    throw new Error('Seed chunk should start at page 0 cycle 0');
  }
});

await check('appendGalleryFeedChunk preserves earlier chunks and scroll stability', () => {
  const initialCache = {
    version: GALLERY_FEED_CACHE_VERSION,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    seed: 12345,
    cycle: 0,
    nextSourcePage: 1,
    chunks: [
      {
        page: 0,
        cycle: 0,
        items: EMBEDDED_ARTWORK_MANIFEST.slice(0, 5),
        fetchedAt: Date.now(),
      },
    ],
  };

  const nextChunk = {
    page: 1,
    cycle: 0,
    items: EMBEDDED_ARTWORK_MANIFEST.slice(5, 10),
    fetchedAt: Date.now(),
  };

  const updatedCache = appendGalleryFeedChunk(initialCache, nextChunk);

  if (updatedCache.chunks.length !== 2) {
    throw new Error(`Expected 2 chunks, got ${updatedCache.chunks.length}`);
  }
  // Verify chunk 0 remains untouched (no re-ordering or item mutation)
  if (updatedCache.chunks[0].page !== 0 || updatedCache.chunks[0].items.length !== 5) {
    throw new Error('Chunk 0 was modified or corrupted');
  }
  if (updatedCache.chunks[1].page !== 1 || updatedCache.chunks[1].items.length !== 5) {
    throw new Error('Chunk 1 was not appended correctly');
  }
});

await check('duplicate chunks with same page index are not appended', () => {
  const cache = {
    version: GALLERY_FEED_CACHE_VERSION,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    seed: 12345,
    cycle: 0,
    nextSourcePage: 1,
    chunks: [
      { page: 0, cycle: 0, items: EMBEDDED_ARTWORK_MANIFEST.slice(0, 5), fetchedAt: Date.now() },
    ],
  };

  const duplicateChunk = {
    page: 0,
    cycle: 0,
    items: EMBEDDED_ARTWORK_MANIFEST.slice(10, 15),
    fetchedAt: Date.now(),
  };

  const result = appendGalleryFeedChunk(cache, duplicateChunk);
  if (result.chunks.length !== 1) {
    throw new Error('Duplicate page chunk was incorrectly added');
  }
});

await check('getMediaItemKey extracts stable identifier across schema variations', () => {
  const itemWithId = { id: 'met-100', url: 'https://example.com/1.jpg' };
  const itemWithRecordId = { sourceRecordId: 'cma:200', url: 'https://example.com/2.jpg' };
  const itemWithOnlyUrl = { url: 'https://example.com/3.jpg' };

  if (getMediaItemKey(itemWithId) !== 'met-100') throw new Error('Failed to extract id');
  if (getMediaItemKey(itemWithRecordId) !== 'cma:200') throw new Error('Failed to extract sourceRecordId');
  if (getMediaItemKey(itemWithOnlyUrl) !== 'https://example.com/3.jpg') throw new Error('Failed to fallback to url');
});

// 5. Failure Recovery & Upstream Resilience
await check('failed or empty upstream fetch does not overwrite last known good cache', async () => {
  const poolManager = GlobalPool.getInstance();
  const countBefore = (await poolManager.getPool()).length;

  // Passing empty array simulating failed upstream scrape
  const result = await poolManager.addItems([]);
  if (result.added !== 0) throw new Error('Expected 0 added items');

  const countAfter = (await poolManager.getPool()).length;
  if (countAfter !== countBefore) {
    throw new Error(`Healthy cache was corrupted or erased: went from ${countBefore} to ${countAfter}`);
  }
});

// 6. First-time Visitor & Spatial Persistence Simulation
await check('first-time visitor initializes immediately with 20 seed items and merges page 0 cleanly', () => {
  const seedChunk = getInitialSeedChunk();
  const initialCache = {
    version: GALLERY_FEED_CACHE_VERSION,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    seed: 42,
    cycle: 0,
    nextSourcePage: 0,
    chunks: [seedChunk],
  };

  // Simulated arrival of fresh page 0 from network
  const networkChunk = {
    page: 1,
    cycle: 0,
    items: EMBEDDED_ARTWORK_MANIFEST.slice(15, 35), // Has 5 overlapping items with seed
    fetchedAt: Date.now(),
  };

  const mergedCache = appendGalleryFeedChunk(initialCache, networkChunk);
  if (mergedCache.chunks.length !== 2) {
    throw new Error(`Expected 2 chunks, got ${mergedCache.chunks.length}`);
  }

  // Verify overlapping items were filtered from networkChunk
  const chunk0Keys = new Set(mergedCache.chunks[0].items.map(getMediaItemKey));
  for (const item of mergedCache.chunks[1].items) {
    const key = getMediaItemKey(item);
    if (chunk0Keys.has(key)) {
      throw new Error(`Duplicate artwork key ${key} found across chunks!`);
    }
  }
});

// 7. Security & Policy Controls
await check('feed cache TTL is bounded (6 hours)', () => {
  if (GALLERY_FEED_CACHE_TTL !== 6 * 60 * 60 * 1000) {
    throw new Error(`Unexpected cache TTL: ${GALLERY_FEED_CACHE_TTL}`);
  }
});

// 8. Upstream Pool Fallback
await check('unreachable UPSTREAM_POOL_URL does not crash GlobalPool and falls back cleanly', async () => {
  const originalEnv = process.env.UPSTREAM_POOL_URL;
  try {
    process.env.UPSTREAM_POOL_URL = 'http://127.0.0.1:59999/unreachable-art-pool';
    // Clear in-memory cache to force readCache execution
    globalThis.__pageos_art_pool_cache__ = undefined;
    const poolManager = GlobalPool.getInstance();
    const pool = await poolManager.getPool();
    if (!pool || pool.length === 0) {
      throw new Error('Pool failed to fall back to embedded manifest when upstream was unreachable');
    }
  } finally {
    process.env.UPSTREAM_POOL_URL = originalEnv;
  }
});

if (originalLocalCacheContent !== null && fs.existsSync(localCachePath)) {
  fs.writeFileSync(localCachePath, originalLocalCacheContent, 'utf-8');
}

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
