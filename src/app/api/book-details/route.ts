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
 * Falls back to Google Books API for the summary if Gutendex fails or returns empty.
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

  let fetchFailed = false;

  try {
    const res = await fetch(`https://gutendex.com/books/${id}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PAGE.OS/1.0 (+open-knowledge-gateway)',
      },
      signal: AbortSignal.timeout(6000), // Reduce timeout so we fallback faster
      next: { revalidate: 86400 },
    });

    if (res.ok) {
      book = (await res.json()) as GutendexBook;
    } else {
      fetchFailed = true;
    }
  } catch (error) {
    console.warn('Gutendex lookup failed, falling back:', error);
    fetchFailed = true;
  }

  // Fallback to Google Books for summary if Gutendex summary is empty or failed
  if (!book.summaries || book.summaries.length === 0 || fetchFailed) {
    try {
      if (titleParam) {
        const query = `intitle:${encodeURIComponent(titleParam)}${authorsParam ? `+inauthor:${encodeURIComponent(authorsParam.split(',')[0])}` : ''}`;
        const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1&langRestrict=en`, {
          signal: AbortSignal.timeout(5000),
          next: { revalidate: 86400 * 7 }
        });
        
        if (gbRes.ok) {
          const gbData = await gbRes.json();
          if (gbData.items && gbData.items.length > 0 && gbData.items[0].volumeInfo.description) {
            book.summaries = [gbData.items[0].volumeInfo.description];
          }
        }
      }
    } catch (gbError) {
      console.warn('Google Books fallback failed:', gbError);
    }
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
