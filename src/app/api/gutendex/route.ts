import { NextRequest, NextResponse } from 'next/server';
import { fetchProjectGutenbergOpdsBooks } from '@/lib/gutenberg-opds';
import { guardRequest } from '@/lib/api-guard';

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
  const guard = guardRequest(request, {
    rules: [
      { name: 'query', maxLength: 200, description: 'search terms' },
      {
        name: 'page',
        pattern: /^\d{1,3}$/,
        description: 'page number (1-999)',
      },
    ],
  });
  if (guard.response) return guard.response;

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
    const [gutendexResult, opdsResult] = await Promise.allSettled([
      fetch(targetUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'PAGE.OS/1.0 (+open-knowledge-gateway)',
        },
        signal: AbortSignal.timeout(4500),
        next: { revalidate: 600 },
      }),
      fetchProjectGutenbergOpdsBooks(query || undefined, Number(page) || 1),
    ]);

    let gutendexData: GutenbergAPIResponse | null = null;
    if (gutendexResult.status === 'fulfilled' && gutendexResult.value.ok) {
      gutendexData = (await gutendexResult.value.json()) as GutenbergAPIResponse;
    } else if (gutendexResult.status === 'fulfilled') {
      const errorText = await gutendexResult.value.text();
      console.warn(
        `Gutendex route warning: ${gutendexResult.value.status} ${gutendexResult.value.statusText}`,
        errorText,
      );
    } else {
      const isTimeout =
        gutendexResult.reason instanceof Error &&
        (gutendexResult.reason.name === 'TimeoutError' ||
          gutendexResult.reason.message.includes('timeout') ||
          (gutendexResult.reason as { code?: number }).code === 23);
      if (isTimeout) {
        console.warn('Gutendex search upstream timed out; serving fallback archive results.');
      } else {
        console.error('Gutendex route failed:', gutendexResult.reason);
      }
    }

    const opdsBooks = opdsResult.status === 'fulfilled' ? opdsResult.value : [];
    if (opdsResult.status === 'rejected') {
      console.error('Project Gutenberg OPDS route failed:', opdsResult.reason);
    }

    const gutendexFailed =
      gutendexResult.status === 'rejected' ||
      (gutendexResult.status === 'fulfilled' && !gutendexResult.value.ok);

    // An empty result set from healthy upstreams is a legitimate no-match
    // response, not an outage; only 502 when every upstream source failed.
    const data = mergeGutenbergResults(gutendexData, opdsBooks);
    if (data.results.length === 0 && gutendexFailed && opdsResult.status === 'rejected') {
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
