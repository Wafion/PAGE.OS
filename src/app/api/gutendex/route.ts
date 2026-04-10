import { NextRequest, NextResponse } from 'next/server';

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
    const res = await fetch(targetUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(30000),
      next: { revalidate: 600 },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Gutendex route failed: ${res.status} ${res.statusText}`, errorText);
      return NextResponse.json(
        { error: `Gutendex fetch failed: ${res.statusText}` },
        { status: res.status },
      );
    }

    const data = await res.json();
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
