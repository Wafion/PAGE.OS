'use client';

import { useMemo } from 'react';
import type { CameraState, ChunkCoord, MediaItem } from './types';

// ── constants ──
export const CHUNK_W = 1200;        // chunk CSS width (masonry columns fill this)
export const GAP = 16;
export const GRID_W = CHUNK_W + GAP; // 1216 — horizontal stride between chunk origins
export const GRID_H = 960;          // 960  — vertical stride (tall enough to prevent overlap)
export const HERO_WIDTH = 640;
export const HERO_HEIGHT = 350;
export const HERO_OFFSET = HERO_HEIGHT + GAP; // chunks start below hero + gap
const CHUNK_ITEMS = 10;             // fewer items = less vertical space needed

// ── seeded PRNG ──
function lcg(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

function getChunkItems(cx: number, cy: number, pool: MediaItem[], excludeUrls?: Set<string>): MediaItem[] {
  if (pool.length === 0) return [];
  const seed = cx * 31337 + cy * 7919;
  const rand = lcg(seed);
  const seen = new Set<number>();
  const items: MediaItem[] = [];
  const maxAttempts = pool.length * 2;

  for (let i = 0; i < CHUNK_ITEMS; i++) {
    let attempts = 0;
    let idx: number;
    do {
      idx = Math.floor(rand() * pool.length);
      attempts++;
    } while (
      (seen.has(idx) || excludeUrls?.has(pool[idx].url)) &&
      attempts < maxAttempts
    );
    if (!seen.has(idx)) {
      seen.add(idx);
      items.push(pool[idx]);
    } else {
      // fallback: just take what we can
      for (let j = 0; j < pool.length; j++) {
        if (!seen.has(j)) {
          seen.add(j);
          items.push(pool[j]);
          break;
        }
      }
    }
  }

  return items;
}

export function useChunkVisibility(
  camera: CameraState,
  viewportW: number,
  viewportH: number,
): ChunkCoord[] {
  return useMemo(() => {
    if (viewportW === 0 || viewportH === 0) return [{ cx: 0, cy: 0 }];

    const buffer = 1;

    // Compute cy range (same for all cx)
    const minCY = Math.floor((camera.y - HERO_OFFSET) / GRID_H) - buffer;
    const maxCY = Math.ceil((camera.y + viewportH / camera.zoom - HERO_OFFSET) / GRID_H) + buffer;

    // cx range is piecewise: cx<0 uses no hero offset, cx>=0 uses HERO_WIDTH
    const negMinCX = Math.min(-1, Math.floor(camera.x / GRID_W) - buffer);
    const negMaxCX = Math.min(-1, Math.ceil((camera.x + viewportW / camera.zoom) / GRID_W) + buffer);
    const posMinCX = Math.max(0, Math.floor((camera.x - HERO_WIDTH) / GRID_W) - buffer);
    const posMaxCX = Math.max(0, Math.ceil((camera.x + viewportW / camera.zoom - HERO_WIDTH) / GRID_W) + buffer);

    const chunks: ChunkCoord[] = [];
    for (let cy = minCY; cy <= maxCY; cy++) {
      for (let cx = negMinCX; cx <= negMaxCX; cx++) chunks.push({ cx, cy });
      for (let cx = posMinCX; cx <= posMaxCX; cx++) chunks.push({ cx, cy });
    }
    if (chunks.length === 0) chunks.push({ cx: 0, cy: 0 });
    return chunks;
  }, [camera, viewportW, viewportH]);
}

export function useGetChunkItems(pool: MediaItem[]) {
  return useMemo(() => {
    const cache = new Map<string, MediaItem[]>();
    const DIRS = [[-1,0],[1,0],[0,-1],[0,1]];

    return (cx: number, cy: number): MediaItem[] => {
      const key = `${cx},${cy}`;
      const cached = cache.get(key);
      if (cached) return cached;

      const excludeUrls = new Set<string>();
      for (const [dx, dy] of DIRS) {
        const nk = `${cx + dx},${cy + dy}`;
        const nItems = cache.get(nk);
        if (nItems) {
          for (const item of nItems) excludeUrls.add(item.url);
        }
      }

      const items = getChunkItems(cx, cy, pool, excludeUrls);
      cache.set(key, items);
      return items;
    };
  }, [pool]);
}