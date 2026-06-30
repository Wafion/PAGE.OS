import { NextResponse } from 'next/server';
import { GlobalPool } from './global-pool';
import { hydratePool } from './resolvers';
import type { MediaItem } from './types';

function lcg(seed: number): () => number {
  let s = seed | 0;
  return () => { s = (s * 1664525 + 1013904223) | 0; return (s >>> 0) / 4294967296; };
}

const CACHE_REFRESH_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

function pickChunkItems(cx: number, cy: number, pool: MediaItem[]): MediaItem[] {
  if (pool.length === 0) return [];
  const seed = cx * 31337 + cy * 7919;
  const rand = lcg(seed);
  const used = new Set<number>();
  const items: MediaItem[] = [];

  for (let i = 0; i < 10; i++) {
    if (used.size >= pool.length) break;
    let idx = Math.floor(rand() * pool.length);
    let attempts = 0;
    while (used.has(idx) && attempts < 50) {
      idx = Math.floor(rand() * pool.length);
      attempts++;
    }
    if (!used.has(idx)) {
      used.add(idx);
      items.push(pool[idx]);
    }
  }
  return items;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cx = searchParams.get('cx');
  const cy = searchParams.get('cy');

  const poolManager = GlobalPool.getInstance();
  let pool = await poolManager.getPool();
  const lastUpdated = await poolManager.getLastUpdated();

  // Trigger background hydration if cache is old or pool is small
  if (Date.now() - lastUpdated > CACHE_REFRESH_INTERVAL || pool.length < 100) {
    // We don't 'await' this to ensure the user gets an instant response
    hydratePool().catch(err => console.error('Hydration error:', err));
  }

  // Fallback: known-valid URLs resolved via Wikipedia API (verified correct hash prefixes)
  if (pool.length === 0) {
    pool = [
      { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/500px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg', width: 500, height: 398, title: 'The Starry Night', creator: 'Vincent van Gogh', year: '1889', type: 'artwork' },
      { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Edvard_Munch_-_The_Scream_-_Google_Art_Project.jpg/500px-Edvard_Munch_-_The_Scream_-_Google_Art_Project.jpg', width: 500, height: 632, title: 'The Scream', creator: 'Edvard Munch', year: '1893', type: 'artwork' },
      { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/500px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg', width: 500, height: 690, title: 'Mona Lisa', creator: 'Leonardo da Vinci', year: '1503', type: 'artwork' },
      { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg/500px-Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg', width: 500, height: 242, title: 'The Creation of Adam', creator: 'Michelangelo', year: '1512', type: 'artwork' },
      { url: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg/500px-The_Persistence_of_Memory.jpg', width: 500, height: 375, title: 'The Persistence of Memory', creator: 'Salvador Dali', year: '1931', type: 'artwork' },
      { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Nighthawks.jpg/500px-Nighthawks.jpg', width: 500, height: 284, title: 'Nighthawks', creator: 'Edward Hopper', year: '1942', type: 'artwork' },
      { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Rembrandt_van_Rijn_-_The_Night_Watch_-_Google_Art_Project.jpg/500px-Rembrandt_van_Rijn_-_The_Night_Watch_-_Google_Art_Project.jpg', width: 500, height: 406, title: 'The Night Watch', creator: 'Rembrandt van Rijn', year: '1642', type: 'artwork' },
    ];
  }

  // Per-chunk: deterministic selection from the shared global pool
  if (cx !== null && cy !== null) {
    return NextResponse.json(pickChunkItems(parseInt(cx), parseInt(cy), pool));
  }

  // Bulk: return a shuffled slice of the pool for general feed
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return NextResponse.json(shuffled.slice(0, 100));
}
