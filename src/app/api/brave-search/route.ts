import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

type WebFallbackResult = {
  title: string;
  link: string;
  type: 'pdf';
};

type WebFallbackCacheEntry = {
  results: WebFallbackResult[];
  expiresAt: number;
};

const WEB_FALLBACK_CACHE_TTL_MS = 1000 * 60 * 30;
const BRAVE_RATE_LIMIT_BACKOFF_MS = 1000 * 60 * 5;
const webFallbackCache = new Map<string, WebFallbackCacheEntry>();
let braveRateLimitedUntil = 0;

function buildBraveSearchUrl(query: string) {
  return `https://search.brave.com/search?q=${encodeURIComponent(query)}&source=web`;
}

function getCachedResults(query: string) {
  const cached = webFallbackCache.get(query);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    webFallbackCache.delete(query);
    return null;
  }

  return cached.results;
}

function looksLikePdfUrl(url: string) {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.endsWith('.pdf')) {
    return true;
  }

  if (lowerUrl.includes('.pdf?') || lowerUrl.includes('.pdf#')) {
    return true;
  }

  return false;
}

async function verifyPdfUrl(url: string) {
  if (looksLikePdfUrl(url)) {
    return true;
  }

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        Accept: 'application/pdf,*/*;q=0.8',
        'User-Agent': 'PAGE.OS/1.0 (web fallback)',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    return contentType.includes('application/pdf');
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim();
  if (!query) {
    return NextResponse.json({ error: 'Query missing' }, { status: 400 });
  }

  const normalizedQuery = query.toLowerCase();
  const cachedResults = getCachedResults(normalizedQuery);

  if (cachedResults) {
    return NextResponse.json(cachedResults, {
      headers: {
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400',
      },
    });
  }

  if (braveRateLimitedUntil > Date.now()) {
    return NextResponse.json(cachedResults ?? [], {
      headers: {
        'Cache-Control': 'public, max-age=120',
      },
    });
  }

  try {
    const response = await fetch(buildBraveSearchUrl(query), {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(7000),
    });

    if (!response.ok) {
      if (response.status === 429) {
        braveRateLimitedUntil = Date.now() + BRAVE_RATE_LIMIT_BACKOFF_MS;
        return NextResponse.json(cachedResults ?? [], {
          headers: {
            'Cache-Control': 'public, max-age=120',
          },
        });
      }

      throw new Error(`Brave search failed with status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const rawLinks = $('a[href^="http"]')
      .map((_, element) => {
        const href = $(element).attr('href');
        const title = $(element).text().trim();
        return href ? { href, title } : null;
      })
      .get()
      .filter((result): result is { href: string; title: string } => result !== null);

    const verifiedCandidates = await Promise.all(
      rawLinks.slice(0, 30).map(async (result) => {
        const isPdf = await verifyPdfUrl(result.href);
        if (!isPdf) {
          return null;
        }

        return result;
      }),
    );

    const seenLinks = new Set<string>();
    const results = verifiedCandidates
      .filter((result): result is { href: string; title: string } => result !== null)
      .map((result) => ({
        title: result.title || result.href,
        link: result.href,
        type: 'pdf' as const,
      }))
      .filter((result) => {
        if (seenLinks.has(result.link)) {
          return false;
        }

        seenLinks.add(result.link);
        return true;
      })
      .slice(0, 5);

    webFallbackCache.set(normalizedQuery, {
      results,
      expiresAt: Date.now() + WEB_FALLBACK_CACHE_TTL_MS,
    });

    return NextResponse.json(results, {
      headers: {
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('[Web Fallback] Brave search route failed:', error);
    return NextResponse.json(cachedResults ?? [], {
      headers: {
        'Cache-Control': 'public, max-age=120',
      },
    });
  }
}
