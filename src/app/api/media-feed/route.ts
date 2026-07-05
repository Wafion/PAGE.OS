import { NextResponse } from 'next/server';
import { GlobalPool } from './global-pool';
import { hydratePool } from './resolvers';
import type { MediaItem } from './types';

const CACHE_REFRESH_INTERVAL = 6 * 60 * 60 * 1000;

const CURATED_MEDIA: MediaItem[] = [
  {
    id: 'gutendex-215',
    sourceRecordId: 'gutendex:215',
    url: 'https://www.gutenberg.org/cache/epub/215/pg215.cover.medium.jpg',
    width: 420,
    height: 640,
    title: 'The Call of the Wild',
    creator: 'Jack London',
    year: '1903',
    type: 'book',
    source: 'gutendex',
    sourceName: 'Project Gutenberg',
    sourceUrl: 'https://www.gutenberg.org/ebooks/215',
    detailUrl: 'https://www.gutenberg.org/ebooks/215',
    description:
      'The Call of the Wild is a short adventure novel about Buck, a domesticated dog forced into the brutal world of the Klondike Gold Rush.',
    genres: ['Adventure', 'Classics', 'Fiction'],
    language: 'English',
    firstPublished: '1903',
    fileFormats: ['EPUB', 'PDF', 'TXT'],
    pages: '232',
    isbn: '--',
    attribution: 'London, Jack. The Call of the Wild. Project Gutenberg.',
    rightsLabel: 'Public Domain',
  },
  {
    id: 'gutendex-84',
    sourceRecordId: 'gutendex:84',
    url: 'https://www.gutenberg.org/cache/epub/84/pg84.cover.medium.jpg',
    width: 420,
    height: 640,
    title: 'Frankenstein; Or, The Modern Prometheus',
    creator: 'Mary Wollstonecraft Shelley',
    year: '1818',
    type: 'book',
    source: 'gutendex',
    sourceName: 'Project Gutenberg',
    sourceUrl: 'https://www.gutenberg.org/ebooks/84',
    detailUrl: 'https://www.gutenberg.org/ebooks/84',
    description:
      'Victor Frankenstein\'s experiment in creating life leads to one of literature\'s most enduring meditations on ambition, creation, and isolation.',
    genres: ['Gothic', 'Science Fiction', 'Classics'],
    language: 'English',
    firstPublished: '1818',
    fileFormats: ['EPUB', 'PDF', 'TXT'],
    pages: '280',
    isbn: '--',
    attribution: 'Shelley, Mary Wollstonecraft. Frankenstein. Project Gutenberg.',
    rightsLabel: 'Public Domain',
  },
  {
    id: 'gutendex-1342',
    sourceRecordId: 'gutendex:1342',
    url: 'https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg',
    width: 420,
    height: 640,
    title: 'Pride and Prejudice',
    creator: 'Jane Austen',
    year: '1813',
    type: 'book',
    source: 'gutendex',
    sourceName: 'Project Gutenberg',
    sourceUrl: 'https://www.gutenberg.org/ebooks/1342',
    detailUrl: 'https://www.gutenberg.org/ebooks/1342',
    description:
      'Austen\'s novel follows Elizabeth Bennet as wit, pride, and first impressions reshape her understanding of love and class.',
    genres: ['Romance', 'Classics', 'Society'],
    language: 'English',
    firstPublished: '1813',
    fileFormats: ['EPUB', 'PDF', 'TXT'],
    pages: '279',
    isbn: '--',
    attribution: 'Austen, Jane. Pride and Prejudice. Project Gutenberg.',
    rightsLabel: 'Public Domain',
  },
];

function lcg(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state * 1664525 + 1013904223) | 0;
    return (state >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], rand: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rand() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function dedupeItems(items: MediaItem[]): MediaItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.sourceRecordId || item.id || item.sourceUrl || item.url;
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getFallbackArtworks(): MediaItem[] {
  return [
    {
      id: 'art-starry-night',
      sourceRecordId: 'fallback:starry-night',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/500px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
      width: 500,
      height: 398,
      title: 'The Starry Night',
      creator: 'Vincent van Gogh',
      year: '1889',
      type: 'artwork',
      source: 'wikimedia',
      sourceName: 'Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
      detailUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
      medium: 'Oil on canvas',
      region: 'Western Europe',
      rightsLabel: 'Public Domain',
    },
    {
      id: 'art-scream',
      sourceRecordId: 'fallback:scream',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/The_Scream.jpg/500px-The_Scream.jpg',
      width: 500,
      height: 630,
      title: 'The Scream',
      creator: 'Edvard Munch',
      year: '1893',
      type: 'artwork',
      source: 'wikimedia',
      sourceName: 'Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:The_Scream.jpg',
      detailUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f4/The_Scream.jpg',
      medium: 'Oil, tempera and pastel on cardboard',
      region: 'Northern Europe',
      rightsLabel: 'Public Domain',
    },
    {
      id: 'art-mona-lisa',
      sourceRecordId: 'fallback:mona-lisa',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/500px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg',
      width: 500,
      height: 690,
      title: 'Mona Lisa',
      creator: 'Leonardo da Vinci',
      year: '1503',
      type: 'artwork',
      source: 'wikimedia',
      sourceName: 'Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg',
      detailUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg',
      medium: 'Oil on poplar panel',
      region: 'Southern Europe',
      rightsLabel: 'Public Domain',
    },
    {
      id: 'art-night-watch',
      sourceRecordId: 'fallback:night-watch',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Rembrandt_van_Rijn_-_The_Night_Watch_-_Google_Art_Project.jpg/500px-Rembrandt_van_Rijn_-_The_Night_Watch_-_Google_Art_Project.jpg',
      width: 500,
      height: 406,
      title: 'The Night Watch',
      creator: 'Rembrandt van Rijn',
      year: '1642',
      type: 'artwork',
      source: 'wikimedia',
      sourceName: 'Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Rembrandt_van_Rijn_-_The_Night_Watch_-_Google_Art_Project.jpg',
      detailUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Rembrandt_van_Rijn_-_The_Night_Watch_-_Google_Art_Project.jpg',
      medium: 'Oil on canvas',
      region: 'Western Europe',
      rightsLabel: 'Public Domain',
    },
  ];
}

function getCombinedPool(pool: MediaItem[]) {
  return dedupeItems([...pool, ...CURATED_MEDIA]);
}

function getRegionBucket(item: MediaItem): string {
  return item.region || item.country || item.culture || item.collection || 'Global';
}

function getMediumBucket(item: MediaItem): string {
  const source = (item.medium || item.tags?.[0] || item.collection || '').toLowerCase();
  if (source.includes('manuscript') || source.includes('scroll')) return 'Manuscript';
  if (source.includes('textile')) return 'Textile';
  if (source.includes('print') || source.includes('woodblock')) return 'Print';
  if (source.includes('sculpt') || source.includes('bronze') || source.includes('stone')) return 'Sculpture';
  if (source.includes('photo')) return 'Photography';
  if (source.includes('oil') || source.includes('canvas') || source.includes('painting')) return 'Painting';
  if (item.type === 'book') return 'Book';
  return 'Artwork';
}

function buildDiverseSelection(seed: number, pool: MediaItem[], limit: number): MediaItem[] {
  const rand = lcg(seed);
  const artworks = seededShuffle(pool.filter((item) => item.type === 'artwork'), rand);
  const books = seededShuffle(pool.filter((item) => item.type === 'book'), rand);
  const regionBuckets = new Map<string, MediaItem[]>();

  for (const artwork of artworks) {
    const bucket = getRegionBucket(artwork);
    const items = regionBuckets.get(bucket) ?? [];
    items.push(artwork);
    regionBuckets.set(bucket, items);
  }

  const orderedRegions = seededShuffle([...regionBuckets.keys()], rand);
  for (const region of orderedRegions) {
    regionBuckets.set(region, seededShuffle(regionBuckets.get(region) ?? [], rand));
  }

  const selection: MediaItem[] = [];
  const recentMediums: string[] = [];
  let regionCursor = 0;

  while (selection.length < Math.max(limit - Math.min(books.length, 2), 0) && orderedRegions.length > 0) {
    const region = orderedRegions[regionCursor % orderedRegions.length];
    const bucket = regionBuckets.get(region) ?? [];
    if (bucket.length === 0) {
      orderedRegions.splice(regionCursor % orderedRegions.length, 1);
      if (orderedRegions.length === 0) {
        break;
      }
      continue;
    }

    const mediumIndex = bucket.findIndex((item) => !recentMediums.includes(getMediumBucket(item)));
    const [picked] = bucket.splice(mediumIndex >= 0 ? mediumIndex : 0, 1);
    selection.push(picked);

    const medium = getMediumBucket(picked);
    recentMediums.push(medium);
    while (recentMediums.length > 3) {
      recentMediums.shift();
    }

    regionCursor += 1;
  }

  const maxBooks = limit >= 10 ? Math.min(books.length, 2) : Math.min(books.length, 1);
  for (let index = 0; index < maxBooks; index += 1) {
    const insertAt = Math.min(selection.length, 3 + index * 5);
    selection.splice(insertAt, 0, books[index]);
  }

  return selection.slice(0, limit);
}

async function fetchMetItemById(itemId: string): Promise<MediaItem | null> {
  const objectId = Number(itemId.replace(/^met-/, ''));
  if (!Number.isFinite(objectId)) return null;

  try {
    const res = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectId}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.primaryImageSmall) return null;

    return {
      id: `met-${data.objectID}`,
      sourceRecordId: `met:${data.objectID}`,
      url: data.primaryImageSmall,
      width: data.primaryImageSmallWidth || 500,
      height: data.primaryImageSmallHeight || 500,
      title: data.title,
      creator: data.artistDisplayName || 'Unknown Artist',
      year: data.objectDate || '',
      type: 'artwork',
      source: 'met',
      sourceName: 'The Metropolitan Museum of Art',
      sourceUrl: data.objectURL || 'https://www.metmuseum.org/art/collection',
      detailUrl: data.primaryImage || data.primaryImageSmall,
      description: data.creditLine || data.objectName || '',
      tags: [data.classification, data.culture, data.period]
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .slice(0, 6),
      medium: data.medium || 'Painting',
      dimensions: data.dimensions || '',
      location: data.repository || 'The Metropolitan Museum of Art',
      collection: data.department || 'Open Access Collection',
      accessionNumber: data.accessionNumber || '',
      creditLine: data.creditLine || '',
      country: data.country || undefined,
      region: data.region || data.country || data.culture || undefined,
      culture: data.culture || undefined,
      period: data.period || undefined,
      attribution: [data.title, data.objectDate, data.artistDisplayName, 'The Metropolitan Museum of Art']
        .filter(Boolean)
        .join('. '),
      rightsLabel: data.isPublicDomain ? 'Public Domain' : 'Archive Source',
      licenseUrl: data.isPublicDomain ? 'https://creativecommons.org/publicdomain/zero/1.0/' : undefined,
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cx = searchParams.get('cx');
  const cy = searchParams.get('cy');
  const itemId = searchParams.get('itemId');

  if (itemId?.startsWith('met-')) {
    const item = await fetchMetItemById(itemId);
    if (item) {
      return NextResponse.json(item);
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const poolManager = GlobalPool.getInstance();
  let pool = await poolManager.getPool();
  const lastUpdated = await poolManager.getLastUpdated();

  if (Date.now() - lastUpdated > CACHE_REFRESH_INTERVAL || pool.length < 120) {
    hydratePool().catch((error) => console.error('Hydration error:', error));
  }

  pool = getCombinedPool(pool.length === 0 ? getFallbackArtworks() : pool);

  if (cx !== null && cy !== null) {
    const seed = parseInt(cx, 10) * 31337 + parseInt(cy, 10) * 7919;
    return NextResponse.json(buildDiverseSelection(seed, pool, 10));
  }

  return NextResponse.json(buildDiverseSelection(Date.now(), pool, 100));
}
