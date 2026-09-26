import { NextRequest, NextResponse } from 'next/server';

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
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id')?.trim();

  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'A numeric book id is required' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://gutendex.com/books/${id}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PAGE.OS/1.0 (+open-knowledge-gateway)',
      },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Gutendex lookup failed (${res.status})` },
        { status: 502 },
      );
    }

    const book = (await res.json()) as GutendexBook;

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
  } catch (error) {
    console.error('Book details route error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch book details', details: errorMessage },
      { status: 500 },
    );
  }
}
