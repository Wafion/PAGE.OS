
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_PROXY_HOSTS = new Set([
  'archive.org',
  'books.google.com',
  'collectionapi.metmuseum.org',
  'commons.wikimedia.org',
  'en.wikisource.org',
  'gutendex.com',
  'gutenberg.org',
  'www.googleapis.com',
  'www.gutenberg.org',
]);

const ALLOWED_PROXY_HOST_SUFFIXES = ['.archive.org', '.wikimedia.org', '.gutenberg.org'];

function isAllowedProxyTarget(url: URL) {
  if (!['http:', 'https:'].includes(url.protocol)) {
    return false;
  }

  if (ALLOWED_PROXY_HOSTS.has(url.hostname)) {
    return true;
  }

  return ALLOWED_PROXY_HOST_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix));
}

const MAX_RETRIES = 2;
const BASE_TIMEOUT_MS = 15000;

async function proxyFetch(url: string, attempt: number): Promise<Response> {
  const headers = new Headers();
  headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  headers.set(
    'Accept',
    'application/pdf,text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  );
  headers.set('Accept-Language', 'en-US,en;q=0.5');

  const timeout = BASE_TIMEOUT_MS + attempt * 5000;
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(timeout),
    redirect: 'follow',
  });

  return res;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrlString = searchParams.get('url');

  if (!targetUrlString) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    const targetUrl = new URL(targetUrlString);
    if (!isAllowedProxyTarget(targetUrl)) {
      return NextResponse.json({ error: 'URL host is not allowed' }, { status: 400 });
    }

    let lastError: unknown = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await proxyFetch(targetUrl.toString(), attempt);

        if (res.ok) {
          const contentType = res.headers.get('Content-Type') || 'application/octet-stream';
          const body = await res.blob();

          return new NextResponse(body, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=600',
            },
          });
        }

        // 404 = permanent failure, don't retry
        if (res.status === 404) {
          return NextResponse.json(
            { error: `Resource not found: ${targetUrl.pathname}` },
            { status: 404 },
          );
        }

        lastError = new Error(`HTTP ${res.status}`);
        console.warn(`Proxy attempt ${attempt + 1} failed for ${targetUrlString}: ${res.status}`);
      } catch (error) {
        lastError = error;
        console.warn(`Proxy attempt ${attempt + 1} error for ${targetUrlString}:`, error instanceof Error ? error.message : error);
      }

      // Brief pause before retry
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    }

    // All retries exhausted
    const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown error';
    console.error(`Proxy failed after ${MAX_RETRIES + 1} attempts for ${targetUrlString}: ${errorMessage}`);
    return NextResponse.json(
      { error: `Source temporarily unavailable after retries: ${errorMessage}` },
      { status: 503 },
    );

  } catch (error) {
    console.error('Proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to proxy request', details: errorMessage }, { status: 500 });
  }
}
