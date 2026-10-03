import { NextRequest, NextResponse } from 'next/server';
import { guardRequest } from '@/lib/api-guard';

type GutendexBook = {
  id: number;
  title: string;
  authors: {
    name: string;
    birth_year: number | null;
    death_year: number | null;
  }[];
  summaries: string[];
  subjects: string[];
  bookshelves: string[];
  copyright: boolean | null;
  download_count: number;
  languages: string[];
};

/**
 * Returns rich details for a single Project Gutenberg book (summary,
 * subjects, bookshelves, author lifespan) via the Gutendex books endpoint.
 * Falls back to Open Library API for the summary if Gutendex fails or returns empty.
 */
export async function GET(request: NextRequest) {
  const guard = guardRequest(request, {
    rules: [
      {
        name: 'id',
        required: true,
        pattern: /^\d{1,7}$/,
        description: 'a numeric book id (max 7 digits)',
      },
    ],
  });
  if (guard.response) return guard.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id')?.trim();
  const titleParam = searchParams.get('title')?.trim() || '';
  const authorsParam = searchParams.get('authors')?.trim() || '';

  let book: Partial<GutendexBook> = {
    id: Number(id),
    title: titleParam,
    authors: authorsParam ? [{ name: authorsParam, birth_year: null, death_year: null }] : [],
    summaries: [],
    subjects: [],
    bookshelves: [],
    copyright: null,
    download_count: 0,
    languages: [],
  };

  // Fetch Gutendex and Google Books concurrently for instant response
  const gutendexPromise = fetch(`https://gutendex.com/books/${id}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'PAGE.OS/1.0 (+open-knowledge-gateway)',
    },
    signal: AbortSignal.timeout(2500),
    next: { revalidate: 86400 },
  })
    .then(async (res) => {
      if (res.ok) return (await res.json()) as GutendexBook;
      return null;
    })
    .catch(() => null);

  const openLibraryPromise = titleParam
    ? fetch(
        `https://openlibrary.org/search.json?title=${encodeURIComponent(titleParam)}${authorsParam ? `&author=${encodeURIComponent(authorsParam.split(',')[0])}` : ''}&limit=1&fields=description`,
        {
          signal: AbortSignal.timeout(3000),
          next: { revalidate: 86400 * 7 },
        },
      )
        .then(async (res) => {
          if (res.ok) {
            const olData = await res.json();
            const desc = olData.docs?.[0]?.description;
            if (typeof desc === 'string') return desc;
            if (desc && typeof desc === 'object' && desc.value) return desc.value;
            return null;
          }
          return null;
        })
        .catch(() => null)
    : Promise.resolve(null);

  const [gutendexResult, olSummary] = await Promise.all([
    gutendexPromise,
    openLibraryPromise,
  ]);

  if (gutendexResult) {
    book = gutendexResult;
  }

  // If Gutendex has no summary or failed, use Open Library summary
  if ((!book.summaries || book.summaries.length === 0) && olSummary) {
    book.summaries = [olSummary];
  }

  return NextResponse.json(
    {
      id: book.id,
      title: book.title,
      authors: book.authors ?? [],
      summaries: book.summaries ?? [],
      subjects: book.subjects ?? [],
      bookshelves: book.bookshelves ?? [],
      copyright: book.copyright ?? null,
      download_count: book.download_count ?? 0,
      languages: book.languages ?? [],
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=86400' },
    },
  );
}
