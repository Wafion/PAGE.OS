import { NextRequest, NextResponse } from 'next/server';
import {
  fetchStandardEbooksSearch,
  fetchStandardEbooksNewReleases,
  getStandardEbooksFallbackBooks,
} from '@/adapters/standard-ebooks';

// ---------------------------------------------------------------------------
// Circuit breaker — matches Gutenberg pattern
// ---------------------------------------------------------------------------

const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 5 * 60 * 1000;

let consecutiveFailures = 0;
let circuitOpenUntil = 0;

function isCircuitOpen(): boolean {
  return Date.now() < circuitOpenUntil;
}

function recordSuccess() {
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
}

function recordFailure() {
  consecutiveFailures += 1;
  if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
    console.warn(
      `[StandardEbooks Circuit] Opened — ${consecutiveFailures} consecutive failures. ` +
        `Will retry after ${CIRCUIT_COOLDOWN_MS / 1000}s`,
    );
  }
}

// ---------------------------------------------------------------------------
// In-memory cache — short-lived, prevents duplicate requests
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string) {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() ?? '';
  const mode = searchParams.get('mode')?.trim() ?? 'search'; // 'search' | 'new-releases'

  const cacheKey = `${mode}:${query}`;

  // Check cache
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=300' },
    });
  }

  // Circuit breaker check
  if (isCircuitOpen()) {
    console.info('[StandardEbooks route] Circuit open — using fallback');
    return NextResponse.json(
      { books: getStandardEbooksFallbackBooks(), sourceLabel: 'curated fallback' },
      { status: 200, headers: { 'Cache-Control': 'public, max-age=60' } },
    );
  }

  try {
    let books;

    if (mode === 'new-releases') {
      books = await fetchStandardEbooksNewReleases();
    } else {
      if (!query) {
        // No query: show new releases
        books = await fetchStandardEbooksNewReleases();
      } else {
        books = await fetchStandardEbooksSearch(query);
      }
    }

    if (books.length === 0) {
      // Try fallback
      const fallback = getStandardEbooksFallbackBooks();
      const result = { books: fallback, sourceLabel: 'curated fallback' };
      setCache(cacheKey, result);
      recordSuccess();
      return NextResponse.json(result, {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=300' },
      });
    }

    const result = { books, sourceLabel: 'Standard Ebooks' };
    setCache(cacheKey, result);
    recordSuccess();

    return NextResponse.json(result, {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=600' },
    });
  } catch (error) {
    console.error('[StandardEbooks route] Error:', error);
    recordFailure();

    const fallback = getStandardEbooksFallbackBooks();
    return NextResponse.json(
      { books: fallback, sourceLabel: 'curated fallback' },
      { status: 200, headers: { 'Cache-Control': 'public, max-age=60' } },
    );
  }
}
