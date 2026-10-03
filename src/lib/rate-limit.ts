/**
 * Shared per-IP rate limiting for PAGE.OS API routes.
 *
 * Single implementation used by every route handler. The limiter is a bounded
 * fixed window: IP keys not seen inside the current window are evicted once
 * the tracker exceeds MAX_TRACKED_IPS, so a flood of unique IPs degrades to
 * no tracking rather than unbounded memory growth.
 */

export type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
};

/** Default per-route budget: a normal reader session stays well under this. */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 300,
  windowMs: 60_000,
};

const MAX_TRACKED_IPS = 10_000;

/**
 * Next.js compiles route handlers into separate bundles, which would give
 * each route its own copy of a module-level Map and silently break shared
 * limiting. Anchor the registry on globalThis so every route in a server
 * process shares one registry (standard Next.js singleton pattern).
 */
const RATE_LIMIT_REGISTRY_KEY = Symbol.for('pageos.rate-limit.buckets');

const globalRegistry = globalThis as unknown as {
  [RATE_LIMIT_REGISTRY_KEY]?: Map<string, number[]>;
};

const buckets: Map<string, number[]> =
  globalRegistry[RATE_LIMIT_REGISTRY_KEY] ?? (globalRegistry[RATE_LIMIT_REGISTRY_KEY] = new Map());

export function isRateLimited(
  key: string,
  now = Date.now(),
  config: RateLimitConfig = DEFAULT_RATE_LIMIT,
): boolean {
  if (!key) return true;
  const windowStart = now - config.windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > windowStart);

  if (hits.length >= config.maxRequests) {
    buckets.set(key, hits);
    return true;
  }

  hits.push(now);
  buckets.set(key, hits);

  if (buckets.size > MAX_TRACKED_IPS) {
    for (const [ip, times] of buckets) {
      if (times.every((t) => t <= windowStart)) {
        buckets.delete(ip);
      }
      if (buckets.size <= MAX_TRACKED_IPS) break;
    }
  }

  return false;
}

/**
 * Minimal structural type so this module stays dependency-free and testable;
 * NextRequest satisfies it.
 */
type HeadersLike = { headers: { get(name: string): string | null } };

export function getClientIp(request: HeadersLike): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.toLowerCase();
  }
  return request.headers.get('x-real-ip')?.trim().toLowerCase() || 'unknown';
}

/** Test hook: clears all limiter state between tests. */
export function resetRateLimitsForTests(): void {
  buckets.clear();
}
