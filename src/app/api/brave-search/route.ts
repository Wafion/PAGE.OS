
import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

type BraveResult = {
  title: string;
  link: string;
  type: 'pdf' | 'txt';
};

type BraveCacheEntry = {
  results: BraveResult[];
  expiresAt: number;
};

const BRAVE_CACHE_TTL_MS = 1000 * 60 * 30;
const BRAVE_RATE_LIMIT_BACKOFF_MS = 1000 * 60 * 5;
const braveCache = new Map<string, BraveCacheEntry>();
let braveRateLimitedUntil = 0;

function makeBraveSearchURL(query: string) {
  // This query is crafted to find ebooks in PDF or TXT format.
  const finalQuery = `${query} ebook  filetype:pdf OR filetype:txt`;
  return `https://search.brave.com/search?q=${encodeURIComponent(finalQuery)}&source=web`;
}

function getCachedResults(query: string) {
  const cached = braveCache.get(query);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    braveCache.delete(query);
    return null;
  }

  return cached.results;
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');
  if (!query) {
    return NextResponse.json({ error: 'Query missing' }, { status: 400 });
  }

  const normalizedQuery = query.trim().toLowerCase();
  const cachedResults = getCachedResults(normalizedQuery);

  if (cachedResults) {
    return NextResponse.json(cachedResults, {
      headers: {
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400',
      },
    });
  }

  if (braveRateLimitedUntil > Date.now()) {
    return NextResponse.json([], {
      headers: {
        'Cache-Control': 'public, max-age=120',
      },
    });
  }

  try {
    const braveURL = makeBraveSearchURL(query);
    
    const res = await fetch(braveURL, {
      headers: {
        // Using a standard browser User-Agent to avoid being blocked.
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
       signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      if (res.status === 429) {
        braveRateLimitedUntil = Date.now() + BRAVE_RATE_LIMIT_BACKOFF_MS;
        return NextResponse.json(cachedResults ?? [], {
          headers: {
            'Cache-Control': 'public, max-age=120',
          },
        });
      }

      throw new Error(`Brave search failed with status: ${res.status}`);
    }
    
    const html = await res.text();
    const $ = cheerio.load(html);

    const rawLinks = $('a[href^="http"]').map((i, el) => {
        return {
            title: $(el).text().trim(),
            href: $(el).attr('href'),
        };
    }).get();

    const results: BraveResult[] = rawLinks.filter(link => 
        link.href && (/\.(pdf|txt)$/i.test(link.href))
    ).map(link => ({
        title: link.title,
        link: link.href!,
        type: link.href!.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt',
    }));

    braveCache.set(normalizedQuery, {
      results: results.slice(0, 5),
      expiresAt: Date.now() + BRAVE_CACHE_TTL_MS,
    });
    
    return NextResponse.json(results.slice(0, 5), {
      headers: {
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error("[Brave Search] An error occurred in the search route:", error);
    return NextResponse.json(cachedResults ?? [], {
      headers: {
        'Cache-Control': 'public, max-age=120',
      },
    });
  }
}
