/**
 * Cultural Context API
 *
 * Resolves the "World Around This" for a given cultural entity.
 * Accepts a media item ID and returns connected cultural objects
 * (artworks → related books, books → related artworks).
 *
 * This endpoint:
 *  1. Fetches the primary entity's full metadata
 *  2. Fetches candidate entities from the global pool + Gutenberg
 *  3. Resolves connections using the cultural context resolver
 *  4. Returns a structured CulturalWorld response
 */

import { NextResponse } from "next/server";
import { GlobalPool } from "../media-feed/global-pool";
import { hydratePool } from "../media-feed/resolvers";
import type { MediaItem } from "../media-feed/types";
import {
  mediaItemToEntity,
  resolveCulturalWorld,
  yearToPeriod,
} from "@/lib/cultural-graph/resolver";
import type { CulturalEntity } from "@/types/cultural-graph";

// ─── Gutenberg context pool ─────────────────────────────────────────────────

const GUTENBERG_CONTEXTUAL_BOOKS: Array<{
  id: string;
  title: string;
  author: string;
  year: string;
  subjects: string[];
  tags: string[];
  culture?: string;
  region?: string;
  period?: string;
  coverUrl: string;
  sourceUrl: string;
}> = [
  // Ancient / Classical
  {
    id: "217",
    title: "The Iliad",
    author: "Homer",
    year: "-750",
    subjects: ["epic", "warfare", "greek mythology"],
    tags: ["ancient", "greek", "war", "heroism", "mythology"],
    culture: "Greek",
    region: "Mediterranean",
    period: "Ancient",
    coverUrl: "https://www.gutenberg.org/cache/epub/217/pg217.cover.medium.jpg",
    sourceUrl: "https://www.gutenberg.org/ebooks/217",
  },
  {
    id: "213",
    title: "The Odyssey",
    author: "Homer",
    year: "-700",
    subjects: ["epic", "journey", "greek mythology"],
    tags: ["ancient", "greek", "voyage", "sea", "adventure", "mythology"],
    culture: "Greek",
    region: "Mediterranean",
    period: "Ancient",
    coverUrl: "https://www.gutenberg.org/cache/epub/213/pg213.cover.medium.jpg",
    sourceUrl: "https://www.gutenberg.org/ebooks/213",
  },
  {
    id: "1497",
    title: "The Republic",
    author: "Plato",
    year: "-380",
    subjects: ["philosophy", "political theory"],
    tags: ["philosophy", "politics", "justice", "greek", "ancient"],
    culture: "Greek",
    region: "Mediterranean",
    period: "Ancient",
    coverUrl: "https://www.gutenberg.org/cache/epub/1497/pg1497.cover.medium.jpg",
    sourceUrl: "https://www.gutenberg.org/ebooks/1497",
  },
  // Medieval
  {
    id: "2383",
    title: "Le Morte d'Arthur",
    author: "Thomas Malory",
    year: "1485",
    subjects: ["legend", "knights", "medieval"],
    tags: ["medieval", "knights", "romance", "chivalry", "legend", "britain"],
    culture: "English",
    region: "Western Europe",
    period: "Medieval",
    coverUrl: "https://www.gutenberg.org/cache/epub/2383/pg2383.cover.medium.jpg",
    sourceUrl: "https://www.gutenberg.org/ebooks/2383",
  },
  {
    id: "726",
    title: "Paradise Lost",
    author: "John Milton",
    year: "1667",
    subjects: ["epic poetry", "religion", "mythology"],
    tags: ["religion", "mythology", "heaven", "fall", "epic", "paradise"],
    culture: "English",
    region: "Western Europe",
    period: "Baroque",
    coverUrl: "https://www.gutenberg.org/cache/epub/726/pg726.cover.medium.jpg",
    sourceUrl: "https://www.gutenberg.org/ebooks/726",
  },
  // Renaissance
  {
    id: "5000",
    title: "The Prince",
    author: "Niccolò Machiavelli",
    year: "1532",
    subjects: ["political theory", "power"],
    tags: ["politics", "power", "renaissance", "italy", "statecraft"],
    culture: "Italian",
    region: "Southern Europe",
    period: "Renaissance",
    coverUrl: "https://www.gutenberg.org/cache/epub/5000/pg5000.cover.medium.jpg",
    sourceUrl: "https://www.gutenberg.org/ebooks/5000",
  },
  // Victorian / 19th Century
  {
    id: "345",
    title: "Dracula",
    author: "Bram Stoker",
    year: "1897",
    subjects: ["gothic", "horror", "vampire"],
    tags: ["gothic", "horror", "victorian", "london", "vampire", "transylvania"],
    culture: "British",
    region: "Western Europe",
    period: "Victorian",
    coverUrl: "https://www.gutenberg.org/cache/epub/345/pg345.cover.medium.jpg",
    sourceUrl: "https://www.gutenberg.org/ebooks/345",
  },
  {
    id: "46",
    title: "A Christmas Carol",
    author: "Charles Dickens",
    year: "1843",
    subjects: ["fiction", "holiday", "moral"],
    tags: ["victorian", "london", "christmas", "redemption", "social"],
    culture: "British",
    region: "Western Europe",
    period: "Victorian",
    coverUrl: "https://www.gutenberg.org/cache/epub/46/pg46.cover.medium.jpg",
    sourceUrl: "https://www.gutenberg.org/ebooks/46",
  },
  {
    id: "16328",
    title: "The Picture of Dorian Gray",
    author: "Oscar Wilde",
    year: "1890",
    subjects: ["aestheticism", "philosophy", "gothic"],
    tags: ["aestheticism", "victorian", "london", "art", "beauty", "decadence"],
    culture: "British",
    region: "Western Europe",
    period: "Victorian",
    coverUrl: "https://www.gutenberg.org/cache/epub/16328/pg16328.cover.medium.jpg",
    sourceUrl: "https://www.gutenberg.org/ebooks/16328",
  },
  // Nature / Landscape
  {
    id: "244",
    title: "Aesthetic Essays",
    author: "John Ruskin",
    year: "1871",
    subjects: ["art criticism", "aesthetics"],
    tags: ["art", "landscape", "nature", "beauty", "criticism", "romantic"],
    culture: "British",
    region: "Western Europe",
    period: "Victorian",
    coverUrl: "https://www.gutenberg.org/cache/epub/244/pg244.cover.medium.jpg",
    sourceUrl: "https://www.gutenberg.org/ebooks/244",
  },
  // Adventure / Sea
  {
    id: "120",
    title: "Treasure Island",
    author: "Robert Louis Stevenson",
    year: "1883",
    subjects: ["adventure", "pirates", "sea"],
    tags: ["adventure", "sea", "pirates", "island", "voyage", "treasure"],
    culture: "British",
    region: "Western Europe",
    period: "Victorian",
    coverUrl: "https://www.gutenberg.org/cache/epub/120/pg120.cover.medium.jpg",
    sourceUrl: "https://www.gutenberg.org/ebooks/120",
  },
  // War / Military
  {
    id: "768",
    title: "Wuthering Heights",
    author: "Emily Brontë",
    year: "1847",
    subjects: ["gothic", "romance", "classic"],
    tags: ["romance", "gothic", "moors", "yorkshire", "passion", "nature"],
    culture: "British",
    region: "Western Europe",
    period: "Victorian",
    coverUrl: "https://www.gutenberg.org/cache/epub/768/pg768.cover.medium.jpg",
    sourceUrl: "https://www.gutenberg.org/ebooks/768",
  },
  // Eastern
  {
    id: "14194",
    title: "The Bhagavad Gita",
    author: "Sir Edwin Arnold",
    year: "1885",
    subjects: ["philosophy", "hinduism", "spirituality"],
    tags: ["india", "philosophy", "spirituality", "dharma", "eastern", "sacred"],
    culture: "Indian",
    region: "South Asia",
    period: "Ancient",
    coverUrl: "https://www.gutenberg.org/cache/epub/14194/pg14194.cover.medium.jpg",
    sourceUrl: "https://www.gutenberg.org/ebooks/14194",
  },
  // East Asia
  {
    id: "2403",
    title: "The Analects of Confucius",
    author: "Confucius",
    year: "-500",
    subjects: ["philosophy", "ethics"],
    tags: ["china", "philosophy", "ethics", "eastern", "wisdom", "confucius"],
    culture: "Chinese",
    region: "East Asia",
    period: "Ancient",
    coverUrl: "https://www.gutenberg.org/cache/epub/2403/pg2403.cover.medium.jpg",
    sourceUrl: "https://www.gutenberg.org/ebooks/2403",
  },
  {
    id: "13084",
    title: "The Book of Songs",
    author: "Confucius",
    year: "-600",
    subjects: ["poetry", "chinese literature"],
    tags: ["china", "poetry", "eastern", "ancient", "songs", "folk"],
    culture: "Chinese",
    region: "East Asia",
    period: "Ancient",
    coverUrl: "https://www.gutenberg.org/cache/epub/13084/pg13084.cover.medium.jpg",
    sourceUrl: "https://www.gutenberg.org/ebooks/13084",
  },
  // Japan
  {
    id: "972",
    title: "Genji Monogatari (The Tale of Genji)",
    author: "Murasaki Shikibu",
    year: "1001",
    subjects: ["japanese literature", "court life"],
    tags: ["japan", "court", "romance", "eastern", "aristocracy", "classic"],
    culture: "Japanese",
    region: "East Asia",
    period: "Medieval",
    coverUrl: "https://www.gutenberg.org/cache/epub/972/pg972.cover.medium.jpg",
    sourceUrl: "https://www.gutenberg.org/ebooks/972",
  },
  // Middle East
  {
    id: "3228",
    title: "The Rubaiyat of Omar Khayyam",
    author: "Omar Khayyam",
    year: "1120",
    subjects: ["poetry", "philosophy"],
    tags: ["persia", "poetry", "philosophy", "middle.east", "persian", "wine"],
    culture: "Persian",
    region: "Middle East",
    period: "Medieval",
    coverUrl: "https://www.gutenberg.org/cache/epub/3228/pg3228.cover.medium.jpg",
    sourceUrl: "https://www.gutenberg.org/ebooks/3228",
  },
  {
    id: "3814",
    title: "Arabian Nights",
    author: "Richard Burton",
    year: "1885",
    subjects: ["folk tales", "adventure", "middle eastern"],
    tags: ["middle.east", "arab", "folk", "adventure", "story", "magic"],
    culture: "Arab",
    region: "Middle East",
    period: "Medieval",
    coverUrl: "https://www.gutenberg.org/cache/epub/3814/pg3814.cover.medium.jpg",
    sourceUrl: "https://www.gutenberg.org/ebooks/3814",
  },
  // Africa / Americas
  {
    id: "2148",
    title: "The Jungle",
    author: "Upton Sinclair",
    year: "1906",
    subjects: ["social criticism", "immigration"],
    tags: ["america", "social", "immigration", "urban", "industrial", "labor"],
    culture: "American",
    region: "North America",
    period: "Modern",
    coverUrl: "https://www.gutenberg.org/cache/epub/2148/pg2148.cover.medium.jpg",
    sourceUrl: "https://www.gutenberg.org/ebooks/2148",
  },
  {
    id: "394",
    title: "The Scarlet Letter",
    author: "Nathaniel Hawthorne",
    year: "1850",
    subjects: ["romance", "historical", "puritan"],
    tags: ["america", "puritan", "new.england", "guilt", "moral", "historical"],
    culture: "American",
    region: "North America",
    period: "Victorian",
    coverUrl: "https://www.gutenberg.org/cache/epub/394/pg394.cover.medium.jpg",
    sourceUrl: "https://www.gutenberg.org/ebooks/394",
  },
  // General
  {
    id: "1661",
    title: "The Adventures of Sherlock Holmes",
    author: "Arthur Conan Doyle",
    year: "1892",
    subjects: ["mystery", "detective", "crime"],
    tags: ["mystery", "london", "victorian", "detective", "crime", "britain"],
    culture: "British",
    region: "Western Europe",
    period: "Victorian",
    coverUrl: "https://www.gutenberg.org/cache/epub/1661/pg1661.cover.medium.jpg",
    sourceUrl: "https://www.gutenberg.org/ebooks/1661",
  },
  {
    id: "2542",
    title: "A Doll's House",
    author: "Henrik Ibsen",
    year: "1879",
    subjects: ["drama", "feminism", "social criticism"],
    tags: ["drama", "feminism", "norway", "social", "marriage", "identity"],
    culture: "Norwegian",
    region: "Northern Europe",
    period: "Victorian",
    coverUrl: "https://www.gutenberg.org/cache/epub/2542/pg2542.cover.medium.jpg",
    sourceUrl: "https://www.gutenberg.org/ebooks/2542",
  },
  {
    id: "55",
    title: "The Wonderful Wizard of Oz",
    author: "L. Frank Baum",
    year: "1900",
    subjects: ["fantasy", "children", "adventure"],
    tags: ["fantasy", "adventure", "magic", "journey", "america", "fairy.tale"],
    culture: "American",
    region: "North America",
    period: "Modern",
    coverUrl: "https://www.gutenberg.org/cache/epub/55/pg55.cover.medium.jpg",
    sourceUrl: "https://www.gutenberg.org/ebooks/55",
  },
];

/**
 * Convert a contextual book record into a CulturalEntity.
 */
function bookToEntity(
  book: (typeof GUTENBERG_CONTEXTUAL_BOOKS)[number],
): CulturalEntity {
  const period = book.period || yearToPeriod(book.year) || undefined;

  return {
    id: `gutenberg:${book.id}`,
    type: "book",
    name: book.title,
    date: book.year,
    source: {
      provider: "gutenberg",
      nativeId: book.id,
      url: book.sourceUrl,
      rights: "Public Domain",
    },
    metadata: {
      authors: book.author,
      subjects: book.subjects,
      tags: book.tags,
      culture: book.culture,
      region: book.region,
      period,
    },
    imageUrl: book.coverUrl,
    sourceUrl: book.sourceUrl,
  };
}

// ─── API Route ──────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  const itemType = searchParams.get("itemType") || "artwork";

  if (!itemId) {
    return NextResponse.json(
      { error: "itemId parameter is required." },
      { status: 400 },
    );
  }

  // 1. Resolve the primary entity
  let primary: CulturalEntity | null = null;

  if (itemType === "book") {
    // For books, build entity from query params or contextual pool
    const title = searchParams.get("title") || "Unknown Book";
    const author = searchParams.get("author") || "Unknown Author";
    const subjects = searchParams.get("subjects")?.split(",") || [];

    primary = {
      id: `book:${itemId}`,
      type: "book",
      name: title,
      source: {
        provider: searchParams.get("source") || "gutenberg",
        nativeId: itemId,
      },
      metadata: {
        authors: author,
        subjects,
        tags: subjects,
      },
      sourceUrl: searchParams.get("sourceUrl") || undefined,
    };
  } else {
    // For artworks, try to get from the global pool
    const poolManager = GlobalPool.getInstance();
    let pool = await poolManager.getPool();

    if (pool.length === 0) {
      hydratePool().catch(() => {});
      pool = await poolManager.getPool();
    }

    const mediaItem = pool.find(
      (item) => item.id === itemId || item.sourceRecordId === itemId,
    );

    if (mediaItem) {
      primary = mediaItemToEntity(mediaItem);
    } else {
      // Try fetching from Met API directly for met- items
      if (itemId.startsWith("met-")) {
        const objectId = parseInt(itemId.replace("met-", ""), 10);
        if (!isNaN(objectId)) {
          try {
            const res = await fetch(
              `https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectId}`,
              { signal: AbortSignal.timeout(5000) },
            );
            if (res.ok) {
              const data = await res.json();
              primary = {
                id: `met:${objectId}`,
                type: "artwork",
                name: data.title,
                description: data.creditLine || "",
                date: data.objectDate || "",
                source: {
                  provider: "met",
                  nativeId: String(objectId),
                  url: data.objectURL,
                  rights: data.isPublicDomain ? "Public Domain" : undefined,
                },
                metadata: {
                  medium: data.medium,
                  dimensions: data.dimensions,
                  collection: data.department,
                  institution: "The Metropolitan Museum of Art",
                  accessionNumber: data.accessionNumber,
                  creditLine: data.creditLine,
                  tags: [data.classification, data.culture, data.period].filter(
                    Boolean,
                  ),
                  culture: data.culture,
                  period: data.period,
                  country: data.country,
                  region: data.region,
                },
                imageUrl: data.primaryImageSmall,
                sourceUrl: data.objectURL,
              };
            }
          } catch {
            // Fall through
          }
        }
      }
    }
  }

  if (!primary) {
    return NextResponse.json(
      { error: "Could not resolve the primary entity." },
      { status: 404 },
    );
  }

  // 2. Build candidate pool (books for artworks, artworks for books)
  const candidates: CulturalEntity[] = [];

  if (primary.type === "artwork") {
    // Artwork → show related books
    for (const book of GUTENBERG_CONTEXTUAL_BOOKS) {
      candidates.push(bookToEntity(book));
    }

    // Also include other artworks from the pool for related-art connections
    const poolManager = GlobalPool.getInstance();
    const pool = await poolManager.getPool();
    for (const item of pool) {
      if (item.id !== itemId && item.type === "artwork") {
        candidates.push(mediaItemToEntity(item));
      }
    }
  } else {
    // Book → show related artworks
    const poolManager = GlobalPool.getInstance();
    let pool = await poolManager.getPool();
    if (pool.length === 0) {
      hydratePool().catch(() => {});
      pool = await poolManager.getPool();
    }

    for (const item of pool) {
      if (item.type === "artwork") {
        candidates.push(mediaItemToEntity(item));
      }
    }

    // Also include related books from the contextual pool
    for (const book of GUTENBERG_CONTEXTUAL_BOOKS) {
      if (book.id !== itemId) {
        candidates.push(bookToEntity(book));
      }
    }
  }

  // 3. Resolve the cultural world
  const world = resolveCulturalWorld(primary, candidates);

  return NextResponse.json(world);
}
