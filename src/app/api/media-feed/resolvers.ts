import type { MediaItem } from './types';

// ── MET Resolver: only reliable source with strict painting/public-domain filter ──
async function fetchFromMet(): Promise<MediaItem[]> {
  try {
    const searchUrl = 'https://collectionapi.metmuseum.org/public/collection/v1/search?q=painting&hasImages=true&limit=300';
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(10000) });
    const searchData = await searchRes.json();
    const objectIds = searchData.objectIDs || [];
    if (objectIds.length === 0) return [];

    // Sample 50 random IDs
    const sampledIds = objectIds.sort(() => 0.5 - Math.random()).slice(0, 50);

    const results: MediaItem[] = [];
    const batchSize = 10;
    for (let i = 0; i < sampledIds.length; i += batchSize) {
      const batch = sampledIds.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(async (id: number) => {
        try {
          const res = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`, { signal: AbortSignal.timeout(5000) });
          if (!res.ok) return null;
          const data = await res.json();
          if (!data.primaryImageSmall) return null;
          if (data.classification !== 'Paintings') return null;
          if (data.isPublicDomain !== true) return null;
          if (!data.title || data.title.length < 3) return null;
          return {
            url: data.primaryImageSmall,
            width: data.primaryImageSmallWidth || 500,
            height: data.primaryImageSmallHeight || 500,
            title: data.title,
            creator: data.artistDisplayName || 'Unknown Artist',
            year: data.objectDate || '',
            type: 'artwork',
            source: 'met' as const,
          };
        } catch { return null; }
      }));
      for (const r of batchResults) { if (r) results.push(r); }
    }
    return results;
  } catch { return []; }
}

export async function hydratePool(): Promise<{ added: number; total: number }> {
  const met = await fetchFromMet();
  const { GlobalPool } = await import('./global-pool');
  return await GlobalPool.getInstance().addItems(met);
}