import { NextResponse } from 'next/server';
import { GlobalPool } from './global-pool';
import { hydratePool } from './resolvers';
import type { MediaItem } from './types';

function lcg(seed: number): () => number {
  let s = seed | 0;
  return () => { s = (s * 1664525 + 1013904223) | 0; return (s >>> 0) / 4294967296; };
}

const CACHE_REFRESH_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

const CURATED_MEDIA: MediaItem[] = [
  {
    id: 'gutendex-215',
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
    isbn: '—',
    attribution: 'London, Jack. The Call of the Wild. Project Gutenberg.',
    rightsLabel: 'Public Domain',
  },
  {
    id: 'gutendex-84',
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
      'Victor Frankenstein’s experiment in creating life leads to one of literature’s most enduring meditations on ambition, creation, and isolation.',
    genres: ['Gothic', 'Science Fiction', 'Classics'],
    language: 'English',
    firstPublished: '1818',
    fileFormats: ['EPUB', 'PDF', 'TXT'],
    pages: '280',
    isbn: '—',
    attribution: 'Shelley, Mary Wollstonecraft. Frankenstein. Project Gutenberg.',
    rightsLabel: 'Public Domain',
  },
  {
    id: 'gutendex-1342',
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
      'Austen’s novel follows Elizabeth Bennet as wit, pride, and first impressions reshape her understanding of love and class.',
    genres: ['Romance', 'Classics', 'Society'],
    language: 'English',
    firstPublished: '1813',
    fileFormats: ['EPUB', 'PDF', 'TXT'],
    pages: '279',
    isbn: '—',
    attribution: 'Austen, Jane. Pride and Prejudice. Project Gutenberg.',
    rightsLabel: 'Public Domain',
  },
];

function getFallbackArtworks(): MediaItem[] {
  return [
    {
      id: 'art-starry-night',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/500px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
      width: 500,
      height: 398,
      title: 'The Starry Night',
      creator: 'Vincent van Gogh',
      year: '1889',
      type: 'artwork',
      source: 'moma',
      sourceName: 'The Museum of Modern Art (MoMA)',
      sourceUrl: 'https://www.moma.org/collection/works/79802',
      detailUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
      description:
        'The Starry Night is one of Van Gogh’s most famous works, depicting the view from Saint-Remy with a swirling sky over a quiet village.',
      tags: ['Post-Impressionism', 'Painting', 'Landscape', 'Night Scene', 'Sky', 'Village'],
      medium: 'Oil on canvas',
      dimensions: '73.7 x 92.1 cm',
      location: 'The Museum of Modern Art (MoMA)',
      collection: 'European Paintings',
      accessionNumber: 'MoMA 313.1941',
      creditLine: 'Gift of Lillie P. Bliss',
      attribution: 'The Starry Night, 1889. Vincent van Gogh. The Museum of Modern Art, New York.',
      rightsLabel: 'Public Domain',
    },
    {
      id: 'art-scream',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Edvard_Munch_-_The_Scream_-_Google_Art_Project.jpg/500px-Edvard_Munch_-_The_Scream_-_Google_Art_Project.jpg',
      width: 500,
      height: 632,
      title: 'The Scream',
      creator: 'Edvard Munch',
      year: '1893',
      type: 'artwork',
      source: 'wikimedia',
      sourceName: 'Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Edvard_Munch_-_The_Scream_-_Google_Art_Project.jpg',
      detailUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/86/Edvard_Munch_-_The_Scream_-_Google_Art_Project.jpg',
      tags: ['Expressionism', 'Painting', 'Emotion'],
      medium: 'Oil, tempera, pastel and crayon on cardboard',
      dimensions: '91 x 73.5 cm',
      location: 'National Museum, Oslo',
      collection: 'Painting collection',
      rightsLabel: 'Public Domain',
    },
    {
      id: 'art-mona-lisa',
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
      tags: ['Renaissance', 'Portrait', 'Oil Painting'],
      medium: 'Oil on poplar panel',
      dimensions: '77 x 53 cm',
      location: 'Musee du Louvre',
      collection: 'Department of Paintings',
      rightsLabel: 'Public Domain',
    },
    {
      id: 'art-creation-adam',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg/500px-Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg',
      width: 500,
      height: 242,
      title: 'The Creation of Adam',
      creator: 'Michelangelo',
      year: '1512',
      type: 'artwork',
      source: 'wikimedia',
      sourceName: 'Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Michelangelo_-_Creation_of_Adam_(cropped).jpg',
      detailUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg',
      tags: ['High Renaissance', 'Fresco', 'Biblical'],
      medium: 'Fresco',
      dimensions: '280 x 570 cm',
      location: 'Sistine Chapel',
      collection: 'Vatican Museums',
      rightsLabel: 'Public Domain',
    },
    {
      id: 'art-persistence-memory',
      url: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg/500px-The_Persistence_of_Memory.jpg',
      width: 500,
      height: 375,
      title: 'The Persistence of Memory',
      creator: 'Salvador Dali',
      year: '1931',
      type: 'artwork',
      source: 'moma',
      sourceName: 'The Museum of Modern Art (MoMA)',
      sourceUrl: 'https://www.moma.org/collection/works/79018',
      detailUrl: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg',
      tags: ['Surrealism', 'Painting', 'Dreamlike'],
      medium: 'Oil on canvas',
      dimensions: '24 x 33 cm',
      location: 'The Museum of Modern Art (MoMA)',
      collection: 'Painting and Sculpture',
      rightsLabel: 'Public Domain',
    },
    {
      id: 'art-nighthawks',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Nighthawks.jpg/500px-Nighthawks.jpg',
      width: 500,
      height: 284,
      title: 'Nighthawks',
      creator: 'Edward Hopper',
      year: '1942',
      type: 'artwork',
      source: 'wikimedia',
      sourceName: 'Art Institute of Chicago / Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Nighthawks.jpg',
      detailUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Nighthawks.jpg',
      tags: ['Realism', 'Painting', 'Urban'],
      medium: 'Oil on canvas',
      dimensions: '84.1 x 152.4 cm',
      location: 'Art Institute of Chicago',
      collection: 'American Art',
      rightsLabel: 'Public Domain',
    },
    {
      id: 'art-night-watch',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Rembrandt_van_Rijn_-_The_Night_Watch_-_Google_Art_Project.jpg/500px-Rembrandt_van_Rijn_-_The_Night_Watch_-_Google_Art_Project.jpg',
      width: 500,
      height: 406,
      title: 'The Night Watch',
      creator: 'Rembrandt van Rijn',
      year: '1642',
      type: 'artwork',
      source: 'wikimedia',
      sourceName: 'Rijksmuseum / Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Rembrandt_van_Rijn_-_The_Night_Watch_-_Google_Art_Project.jpg',
      detailUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Rembrandt_van_Rijn_-_The_Night_Watch_-_Google_Art_Project.jpg',
      tags: ['Baroque', 'Painting', 'Militia Portrait'],
      medium: 'Oil on canvas',
      dimensions: '363 x 437 cm',
      location: 'Rijksmuseum, Amsterdam',
      collection: 'Dutch Golden Age',
      rightsLabel: 'Public Domain',
    },
  ];
}

function getCombinedPool(pool: MediaItem[]) {
  return [...CURATED_MEDIA, ...pool];
}

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
  pool = getCombinedPool(pool.length === 0 ? getFallbackArtworks() : pool);

  // Per-chunk: deterministic selection from the shared global pool
  if (cx !== null && cy !== null) {
    return NextResponse.json(pickChunkItems(parseInt(cx), parseInt(cy), pool));
  }

  // Bulk: return a shuffled slice of the pool for general feed
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return NextResponse.json(shuffled.slice(0, 100));
}
