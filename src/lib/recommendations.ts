import {
  FALLBACK_GUTENBERG_BOOKS,
  getFallbackGutenbergBooks,
  type MappedGutenbergBook,
} from "@/adapters/gutendex";

type OpenLibrarySearchResponse = {
  docs?: OpenLibraryWork[];
};

type OpenLibraryWork = {
  title: string;
  author_name?: string[];
  ratings_average?: number;
  ratings_count?: number;
  want_to_read_count?: number;
  already_read_count?: number;
};

type GutendexBook = {
  id: number;
  title: string;
  authors: { name: string }[];
  formats: Record<string, string>;
  subjects?: string[];
};

type GutendexResponse = {
  results?: GutendexBook[];
};

const OPEN_LIBRARY_ENDPOINT = "https://openlibrary.org/search.json";
const GUTENDEX_ENDPOINT = "https://gutendex.com/books/";

export const RECOMMENDATION_PROFILES = {
  popular: {
    subjects: ["classic_literature", "science_fiction", "mystery_and_detective_stories"],
    fallbackQuery: "",
  },
  "science-fiction": {
    subjects: ["science_fiction"],
    fallbackQuery: "science fiction",
  },
  mystery: {
    subjects: ["mystery_and_detective_stories", "detective_and_mystery_stories"],
    fallbackQuery: "mystery",
  },
  romance: {
    subjects: ["love_stories", "romance_fiction"],
    fallbackQuery: "romance",
  },
  adventure: {
    subjects: ["adventure_and_adventurers", "adventure_stories"],
    fallbackQuery: "adventure",
  },
} as const;

export type RecommendationGenreKey = keyof typeof RECOMMENDATION_PROFILES;

export type RecommendationShelfResponse = {
  books: MappedGutenbergBook[];
  sourceLabel: string;
};

type CachedShelf = RecommendationShelfResponse & {
  expiresAt: number;
};

const RECOMMENDATION_CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const recommendationShelfCache = new Map<string, CachedShelf>();

function normalizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function compactText(value: string) {
  return normalizeText(value).replace(/\s+/g, "");
}

function mapGutendexBook(book: GutendexBook): MappedGutenbergBook {
  return {
    id: String(book.id),
    title: book.title,
    authors: book.authors.map((author) => author.name).join(", "),
    formats: book.formats,
    source: "gutendex",
    subjects: book.subjects ?? [],
  };
}

function dedupeBooks(books: MappedGutenbergBook[]) {
  const seen = new Set<string>();
  return books.filter((book) => {
    const key = `${book.source}:${book.id}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function scoreOpenLibraryWork(work: OpenLibraryWork) {
  const ratingsAverage = work.ratings_average ?? 0;
  const ratingsCount = work.ratings_count ?? 0;
  const wantToReadCount = work.want_to_read_count ?? 0;
  const alreadyReadCount = work.already_read_count ?? 0;

  return (
    ratingsAverage * 100 +
    Math.log10(ratingsCount + 1) * 50 +
    Math.log10(alreadyReadCount + 1) * 30 +
    Math.log10(wantToReadCount + 1) * 20
  );
}

function interleaveGroups<T>(groups: T[][]) {
  const mixed: T[] = [];
  const maxLength = Math.max(...groups.map((group) => group.length), 0);

  for (let index = 0; index < maxLength; index += 1) {
    groups.forEach((group) => {
      const item = group[index];
      if (item) {
        mixed.push(item);
      }
    });
  }

  return mixed;
}

async function fetchOpenLibrarySubject(subject: string, limit: number) {
  const params = new URLSearchParams({
    subject,
    sort: "rating",
    limit: String(limit),
    fields:
      "title,author_name,ratings_average,ratings_count,want_to_read_count,already_read_count",
  });

  const response = await fetch(`${OPEN_LIBRARY_ENDPOINT}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "PAGE.OS/1.0 (reader recommendations)",
    },
    signal: AbortSignal.timeout(4000),
    next: { revalidate: 21600 },
  });

  if (!response.ok) {
    throw new Error(`Open Library subject fetch failed: ${response.status}`);
  }

  const data = (await response.json()) as OpenLibrarySearchResponse;
  return (data.docs ?? [])
    .filter((work) => work.title && (work.author_name?.length ?? 0) > 0)
    .sort((a, b) => scoreOpenLibraryWork(b) - scoreOpenLibraryWork(a));
}

async function fetchGutendexShelf(query?: string) {
  const params = new URLSearchParams();
  if (query) {
    params.set("search", query);
  } else {
    params.set("sort", "popular");
  }
  params.set("page", "1");

  const response = await fetch(`${GUTENDEX_ENDPOINT}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "PAGE.OS/1.0 (reader recommendations)",
    },
    signal: AbortSignal.timeout(4000),
    next: { revalidate: 21600 },
  });

  if (!response.ok) {
    throw new Error(`Gutendex fetch failed: ${response.status}`);
  }

  const data = (await response.json()) as GutendexResponse;
  return (data.results ?? []).map(mapGutendexBook);
}

function scoreBookAgainstWorks(book: MappedGutenbergBook, works: OpenLibraryWork[], query: string) {
  const bookTitle = normalizeText(book.title);
  const bookTitleCompact = compactText(book.title);
  const bookAuthors = normalizeText(book.authors);
  const bookSubjects = normalizeText((book.subjects ?? []).join(" "));
  const normalizedQuery = normalizeText(query);

  let bestReaderScore = 0;

  works.forEach((work) => {
    const workTitle = normalizeText(work.title);
    const workTitleCompact = compactText(work.title);
    const workAuthor = normalizeText(work.author_name?.[0] ?? "");
    const workScore = scoreOpenLibraryWork(work);

    let matchScore = 0;

    if (bookTitleCompact === workTitleCompact) matchScore += 260;
    if (bookTitle === workTitle) matchScore += 220;
    if (bookTitle.includes(workTitle) || workTitle.includes(bookTitle)) matchScore += 140;
    if (workAuthor && bookAuthors.includes(workAuthor)) matchScore += 120;

    if (matchScore >= 260) {
      bestReaderScore = Math.max(bestReaderScore, workScore + matchScore);
    }
  });

  let subjectScore = 0;

  if (normalizedQuery) {
    if (bookSubjects.includes(normalizedQuery)) subjectScore += 90;
    if (bookTitle.includes(normalizedQuery)) subjectScore += 35;
  }

  return bestReaderScore + subjectScore;
}

function getProfile(key: string) {
  return RECOMMENDATION_PROFILES[
    (key in RECOMMENDATION_PROFILES ? key : "popular") as RecommendationGenreKey
  ];
}

export function isRecommendationGenreKey(key: string): key is RecommendationGenreKey {
  return key in RECOMMENDATION_PROFILES;
}

export async function getRecommendationShelf(
  genre: RecommendationGenreKey,
  limit = 12,
): Promise<RecommendationShelfResponse> {
  const cacheKey = `${genre}:${limit}`;
  const cachedShelf = recommendationShelfCache.get(cacheKey);

  if (cachedShelf && cachedShelf.expiresAt > Date.now()) {
    return {
      books: cachedShelf.books,
      sourceLabel: cachedShelf.sourceLabel,
    };
  }

  const profile = getProfile(genre);

  try {
    const [subjectResults, liveGutendexShelf] = await Promise.all([
      Promise.allSettled(
        profile.subjects.map((subject) => fetchOpenLibrarySubject(subject, 14)),
      ),
      fetchGutendexShelf(profile.fallbackQuery || undefined).catch(() => []),
    ]);

    const subjectGroups = subjectResults.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );

    const topWorks = interleaveGroups(subjectGroups.map((group) => group.slice(0, 8)));
    const fallbackShelf = getFallbackGutenbergBooks(profile.fallbackQuery);
    const candidateBooks = dedupeBooks([
      ...liveGutendexShelf,
      ...fallbackShelf,
      ...FALLBACK_GUTENBERG_BOOKS,
    ]);

    const rankedBooks = candidateBooks
      .map((book) => ({
        book,
        score: scoreBookAgainstWorks(book, topWorks, profile.fallbackQuery),
      }))
      .sort((a, b) => b.score - a.score);

    const matchedBooks = rankedBooks
      .filter((entry) => entry.score > 0)
      .map((entry) => entry.book);

    if (matchedBooks.length > 0) {
      const shelf = {
        books: dedupeBooks([
          ...matchedBooks,
          ...liveGutendexShelf,
          ...fallbackShelf,
          ...FALLBACK_GUTENBERG_BOOKS,
        ]).slice(0, limit),
        sourceLabel:
          matchedBooks.length >= Math.min(limit, 4)
            ? "reader-loved shelf"
            : "reader-loved shelf with fallback classics",
      };

      recommendationShelfCache.set(cacheKey, {
        ...shelf,
        expiresAt: Date.now() + RECOMMENDATION_CACHE_TTL_MS,
      });

      return shelf;
    }

    const fallbackShelfResult = {
      books: dedupeBooks([...liveGutendexShelf, ...fallbackShelf, ...FALLBACK_GUTENBERG_BOOKS]).slice(0, limit),
      sourceLabel: "curated fallback shelf",
    };

    recommendationShelfCache.set(cacheKey, {
      ...fallbackShelfResult,
      expiresAt: Date.now() + RECOMMENDATION_CACHE_TTL_MS,
    });

    return fallbackShelfResult;
  } catch (error) {
    console.error("Failed to build recommendation shelf:", error);
    const fallbackShelfResult = {
      books: getFallbackGutenbergBooks(profile.fallbackQuery).slice(0, limit),
      sourceLabel: "curated fallback shelf",
    };

    recommendationShelfCache.set(cacheKey, {
      ...fallbackShelfResult,
      expiresAt: Date.now() + 1000 * 60 * 30,
    });

    return fallbackShelfResult;
  }
}
