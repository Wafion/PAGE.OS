import { NextRequest, NextResponse } from 'next/server';
import { fetchProjectGutenbergOpdsBooks } from '@/lib/gutenberg-opds';
import { isGutenbergCircuitOpen } from '@/lib/gutenberg-client';

type GutenbergBook = {
  id: number;
  title: string;
  authors: { name: string }[];
  formats: Record<string, string>;
  subjects?: string[];
};

type GutenbergAPIResponse = {
  results?: GutenbergBook[];
};

function mapOpdsBookToGutendexShape(book: Awaited<ReturnType<typeof fetchProjectGutenbergOpdsBooks>>[number]) {
  return {
    id: Number(book.id),
    title: book.title,
    authors: book.authors
      .split(/\s+(?:and|,)\s+/i)
      .filter(Boolean)
      .map((name) => ({ name })),
    formats: book.formats,
    subjects: book.subjects ?? [],
  };
}

function mergeGutenbergResults(
  gutendexData: GutenbergAPIResponse | null,
  opdsBooks: Awaited<ReturnType<typeof fetchProjectGutenbergOpdsBooks>>,
) {
  const seen = new Set<string>();
  const results: GutenbergBook[] = [];

  [...(gutendexData?.results ?? []), ...opdsBooks.map(mapOpdsBookToGutendexShape)].forEach((book) => {
    const key = String(book.id);
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    results.push(book);
  });

  return {
    ...(gutendexData ?? {}),
    results,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim();
  const page = searchParams.get('page')?.trim() || '1';

  const params = new URLSearchParams();
  if (query) {
    params.set('search', query);
  } else {
    params.set('sort', 'popular');
  }
  params.set('page', page);

  const targetUrl = `https://gutendex.com/books/?${params.toString()}`;

  try {
    // If the circuit is open, skip Gutendex and go straight to OPDS
    const gutendexPromise = isGutenbergCircuitOpen()
      ? Promise.resolve(null).then(() => {
          console.info('[Gutendex route] Circuit open — skipping Gutendex API');
          return null;
        })
      : fetch(targetUrl, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'PAGE.OS/1.0 (+open-knowledge-gateway)',
          },
          signal: AbortSignal.timeout(10000),
          next: { revalidate: 600 },
        });

    const [gutendexResult, opdsResult] = await Promise.allSettled([
      gutendexPromise,
      fetchProjectGutenbergOpdsBooks(query || undefined, Number(page) || 1),
    ]);

    let gutendexData: GutenbergAPIResponse | null = null;
    if (gutendexResult.status === 'fulfilled' && gutendexResult.value && gutendexResult.value.ok) {
      gutendexData = (await gutendexResult.value.json()) as GutenbergAPIResponse;
    } else if (gutendexResult.status === 'fulfilled' && gutendexResult.value) {
      const errorText = await gutendexResult.value.text();
      console.error(
        `Gutendex route failed: ${gutendexResult.value.status} ${gutendexResult.value.statusText}`,
        errorText,
      );
    } else if (gutendexResult.status === 'rejected') {
      console.error('Gutendex route failed:', gutendexResult.reason);
    }

    const opdsBooks = opdsResult.status === 'fulfilled' ? opdsResult.value : [];
    if (opdsResult.status === 'rejected') {
      console.error('Project Gutenberg OPDS route failed:', opdsResult.reason);
    }

    const data = mergeGutenbergResults(gutendexData, opdsBooks);
    if (data.results.length === 0) {
      return NextResponse.json(
        { error: 'Failed to fetch Gutenberg data' },
        { status: 502 },
      );
    }

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=600',
      },
    });
  } catch (error) {
    console.error('Gutendex route error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch Gutendex data', details: errorMessage },
      { status: 500 },
    );
  }
}
