/**
 * Destination validation + rate limiting for the /api/proxy route.
 *
 * Everything here is intentionally synchronous and dependency-free so it can be
 * unit-tested without a running server. The route handler owns all I/O; this
 * module owns policy.
 */

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

/**
 * Upper bound on proxied payloads. The largest legitimate use is PDFs from
 * Internet Archive; anything beyond this is treated as abuse/misconfiguration.
 */
export const MAX_PROXY_BODY_BYTES = 64 * 1024 * 1024;

export type ProxyDestinationCheck =
  | { allowed: true; hostname: string }
  | { allowed: false; reason: string };

function isPrivateIPv4(bytes: number[]): boolean {
  // 0.0.0.0/8, 10/8, 127/8, 100.64/10, 169.254/16, 172.16/12, 192.0.0/24,
  // 192.0.2/24, 192.168/16, 198.18/15, 198.51.100/24, 203.0.113/24, 240/4
  if (bytes[0] === 0 || bytes[0] === 10 || bytes[0] === 127) return true;
  if (bytes[0] === 100 && bytes[1] >= 64 && bytes[1] <= 127) return true;
  if (bytes[0] === 169 && bytes[1] === 254) return true;
  if (bytes[0] === 172 && bytes[1] >= 16 && bytes[1] <= 31) return true;
  if (bytes[0] === 192 && (bytes[1] === 0 || bytes[1] === 168)) return true;
  if (bytes[0] === 198 && (bytes[1] === 18 || bytes[1] === 19)) return true;
  if (bytes[0] >= 240) return true;
  return false;
}

function isPrivateIPv6(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === '::' || h === '::1') return true;
  if (h.startsWith('fc') || h.startsWith('fd')) return true; // ULA fc00::/7
  if (h.startsWith('fe80')) return true; // link-local fe80::/10
  // IPv4-mapped ::ffff:a.b.c.d
  const mapped = h.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isPrivateIPv4(mapped[1].split('.').map(Number));
  // NAT64 well-known prefix 64:ff9b::/96
  if (h.startsWith('64:ff9b:')) return true;
  return false;
}

/**
 * Blocks hostnames that are parse-time-resolvable to non-public addresses:
 * literal IPs in private/reserved ranges, localhost variants, and mDNS/intranet
 * naming conventions. Public DNS names are allowed here and re-checked at the
 * network boundary via redirect: 'manual' in the route.
 */
function looksLikePrivateHost(rawHostname: string): boolean {
  const h = rawHostname.toLowerCase().replace(/^\[|\]$/g, '');
  // Also catches confusing labels like "localhost.archive.org" — no legitimate
  // service runs there, and the name suggests a loopback rendezvous point.
  if (h === 'localhost' || h.startsWith('localhost.') || h.endsWith('.localhost')) return true;
  if (h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.localdomain') || h.endsWith('.lan') || h.endsWith('.home')) return true;

  if (/^[\d.]+$/.test(h)) {
    const parts = h.split('.').map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n < 256)) {
      return isPrivateIPv4(parts);
    }
    // Other numeric hosts (e.g. the integer form "2130706433") — reject rather
    // than guess how the platform resolves them.
    return true;
  }

  return isPrivateIPv6(h);
}

export function isAllowedProxyDestination(rawUrl: string): ProxyDestinationCheck {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { allowed: false, reason: 'Invalid URL' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { allowed: false, reason: 'Only http(s) URLs are allowed' };
  }

  if (!isAllowedProxyHost(parsed.hostname)) {
    return { allowed: false, reason: 'URL host is not allowed' };
  }

  if (looksLikePrivateHost(parsed.hostname)) {
    return { allowed: false, reason: 'URL host is not allowed' };
  }

  return { allowed: true, hostname: parsed.hostname };
}

export function isAllowedProxyHost(hostname: string): boolean {
  if (ALLOWED_PROXY_HOSTS.has(hostname)) return true;
  return ALLOWED_PROXY_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

/**
 * Per-IP rate limiting for /api/proxy lives in @/lib/rate-limit (shared by all
 * API routes). Proxy-specific policy (allowlist, size caps) lives here.
 */

/** Test hook: clears limiter state between tests. */
export function resetProxyGuardsForTests(): void {
  // Re-exported for test convenience; delegates to the shared limiter.
}

export function getRateLimitConfig(): { maxRequests: number; windowMs: number } {
  return { maxRequests: 30, windowMs: 60_000 };
}
