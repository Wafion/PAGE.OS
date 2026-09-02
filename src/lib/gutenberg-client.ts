/**
 * Shared Gutenberg client with:
 * - Circuit breaker: stops hammering Gutendex after N consecutive failures
 * - Short-lived cache: prevents duplicate requests for the same URL within 30 min
 * - Used by /api/gutendex, recommendations, and the gutendex adapter
 */

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CIRCUIT_BREAKER_THRESHOLD = 3;  // open after 3 consecutive failures
const CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000; // stay open for 5 minutes

interface CacheEntry {
  data: Response;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

let consecutiveFailures = 0;
let circuitOpenUntil = 0;

export function isGutenbergCircuitOpen(): boolean {
  return Date.now() < circuitOpenUntil;
}

export function getGutenbergCircuitRemainingMs(): number {
  if (!isGutenbergCircuitOpen()) return 0;
  return circuitOpenUntil - Date.now();
}

function recordSuccess() {
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
}

function recordFailure() {
  consecutiveFailures += 1;
  if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitOpenUntil = Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS;
    console.warn(
      `[Gutenberg Circuit] Opened — ${consecutiveFailures} consecutive failures. ` +
      `Will retry after ${CIRCUIT_BREAKER_COOLDOWN_MS / 1000}s`,
    );
  }
}

/**
 * Fetch from a Gutendex/Gutenberg URL with circuit breaker and caching.
 * Returns `null` if the circuit is open (caller should fall through to fallback).
 */
export async function resilientGutenbergFetch(
  url: string,
  timeoutMs = 8000,
): Promise<Response | null> {
  // Circuit breaker: skip immediately if open
  if (isGutenbergCircuitOpen()) {
    return null;
  }

  // Cache check
  const cached = cache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data.clone();
  }

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PAGE.OS/1.0 (+open-knowledge-gateway)',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      recordFailure();
      return null;
    }

    recordSuccess();

    // Cache successful response
    const clone = res.clone();
    cache.set(url, {
      data: clone,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return res;
  } catch (error) {
    recordFailure();
    return null;
  }
}

/**
 * Clear the circuit breaker (useful for testing or manual reset).
 */
export function resetGutenbergCircuit() {
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
  cache.clear();
}
