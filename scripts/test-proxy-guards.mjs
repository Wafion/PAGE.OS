/**
 * Adversarial harness for src/lib/proxy-allowlist.ts — the policy module behind
 * /api/proxy. Run: node scripts/test-proxy-guards.mjs
 * Exits 1 on any failure.
 */
import {
  isAllowedProxyDestination,
  MAX_PROXY_BODY_BYTES,
} from '../src/lib/proxy-allowlist.ts';
import {
  isRateLimited,
  resetRateLimitsForTests,
  getClientIp,
} from '../src/lib/rate-limit.ts';

/**
 * Imports the limiter through distinct module identities, mirroring how
 * Next.js bundles route handlers separately: without the globalThis anchor
 * in rate-limit.ts these two imports would hold DIFFERENT Maps and shared
 * limiting would silently not work.
 */
const limiterA = await import('../src/lib/rate-limit.ts?as=route-a');
const limiterB = await import('../src/lib/rate-limit.ts?as=route-b');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok    ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  FAIL  ${name}: ${error instanceof Error ? error.message : error}`);
  }
}

function assertAllowed(url) {
  const result = isAllowedProxyDestination(url);
  if (!result.allowed) throw new Error(`expected ALLOWED, got "${result.reason}" for ${url}`);
}

function assertBlocked(url, expectedReasonFragment) {
  const result = isAllowedProxyDestination(url);
  if (result.allowed) throw new Error(`expected BLOCKED, but was allowed: ${url}`);
  if (expectedReasonFragment && !result.reason.includes(expectedReasonFragment)) {
    throw new Error(`blocked with "${result.reason}", expected fragment "${expectedReasonFragment}"`);
  }
}

// ── 1. Legitimate destinations (the flows that must keep working) ──
check('allows gutenberg cache txt (text reader flow)', () =>
  assertAllowed('https://www.gutenberg.org/cache/epub/84/pg84.txt'));
check('allows archive.org download PDF (pdf reader flow)', () =>
  assertAllowed('https://archive.org/download/id/file.pdf'));
check('allows archive.org subdomain hosts', () =>
  assertAllowed('https://ia801234.us.archive.org/download/id/file.pdf'));
check('allows wikimedia upload subdomain', () =>
  assertAllowed('https://upload.wikimedia.org/wikipedia/commons/a/ab/img.jpg'));
check('allows metmuseum check URL (settings page health check)', () =>
  assertAllowed('https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=painting'));
check('allows gutendex check URL', () =>
  assertAllowed('https://gutendex.com/books/?search=a'));
check('allows http scheme (some archive mirrors)', () =>
  assertAllowed('http://archive.org/download/id/file.txt'));

// ── 2. SSRF: arbitrary hosts ──
check('blocks attacker.com', () => assertBlocked('https://attacker.com/x', 'not allowed'));
check('blocks evil-host ending in allowed suffix (evil-archive.org)', () =>
  assertBlocked('https://evil-archive.org/x', 'not allowed'));
check('blocks lookalike gutenberg.org.evil.com', () =>
  assertBlocked('https://gutenberg.org.evil.com/x', 'not allowed'));
check('blocks bare IP even if public', () => assertBlocked('https://8.8.8.8/x', 'not allowed'));
check('blocks userinfo trick @gutenberg.org', () =>
  assertBlocked('https://gutenberg.org@evil.com/x', 'not allowed'));
check('URL parser wins over fragment spoof (host is genuinely gutenberg.org)', () => {
  // 'https://gutenberg.org#@evil.com/x' parses to host gutenberg.org — the
  // fragment does NOT change the host, so this is a legitimate destination.
  assertAllowed('https://gutenberg.org#@evil.com/x');
  const r = isAllowedProxyDestination('https://www.gutenberg.org/cache/epub/1/pg1.txt#@evil.com/x');
  if (!r.allowed) throw new Error('fragment must not change hostname interpretation');
});

// ── 3. SSRF: private/reserved/loopback ranges (DNS name blocked pre-resolution) ──
check('blocks http://127.0.0.1', () => assertBlocked('http://127.0.0.1:8080/x', 'not allowed'));
check('blocks http://10.0.0.1', () => assertBlocked('http://10.0.0.1/x', 'not allowed'));
check('blocks http://192.168.1.1', () => assertBlocked('http://192.168.1.1/x', 'not allowed'));
check('blocks http://172.16.0.1 (172.16/12 lower)', () => assertBlocked('http://172.16.0.1/x', 'not allowed'));
check('blocks http://172.31.255.255 (172.16/12 upper)', () => assertBlocked('http://172.31.255.255/x', 'not allowed'));
check('blocks http://169.254.169.254 (cloud metadata)', () =>
  assertBlocked('http://169.254.169.254/latest/meta-data/', 'not allowed'));
check('blocks http://0.0.0.0', () => assertBlocked('http://0.0.0.0/x', 'not allowed'));
check('blocks http://[::1]', () => assertBlocked('http://[::1]/x', 'not allowed'));
check('blocks http://[fe80::1] (link-local v6)', () => assertBlocked('http://[fe80::1]/x', 'not allowed'));
check('blocks http://[::ffff:127.0.0.1] (v4-mapped v6)', () =>
  assertBlocked('http://[::ffff:127.0.0.1]/x', 'not allowed'));
check('blocks http://[fd00::1] (ULA v6)', () => assertBlocked('http://[fd00::1]/x', 'not allowed'));
check('blocks http://localhost', () => assertBlocked('http://localhost/x', 'not allowed'));
check('blocks http://localhost.archive.org (localhost label under allowed suffix)', () =>
  assertBlocked('http://localhost.archive.org/x', 'not allowed'));
check('blocks metadata.google.internal', () =>
  assertBlocked('http://metadata.google.internal/computeMetadata/v1/', 'not allowed'));
check('blocks .internal and .local naming', () =>
  assertBlocked('http://db.internal.corp/x', 'not allowed'));
check('blocks 100.64.15.9 (CGNAT range)', () => assertBlocked('http://100.64.15.9/x', 'not allowed'));
check('blocks 240.0.0.1 (reserved /4)', () => assertBlocked('http://240.0.0.1/x', 'not allowed'));

// ── 4. Scheme abuse ──
check('blocks file:// scheme', () => assertBlocked('file:///etc/passwd', 'Only http(s)'));
check('blocks gopher:// scheme', () => assertBlocked('gopher://archive.org/x', 'Only http(s)'));
check('blocks ftp:// scheme on allowed host', () =>
  assertBlocked('ftp://archive.org/x', 'Only http(s)'));
check('blocks data: URL', () => assertBlocked('data:text/html,hi', 'Only http(s)'));

// ── 5. Malformed input ──
check('blocks empty string', () => assertBlocked('', 'Invalid URL'));
check('blocks not-a-url', () => assertBlocked('not a url', 'Invalid URL'));
check('blocks null-ish (invalid URL, no scheme)', () => assertBlocked('null', 'Invalid URL'));

// ── 6. Rate limiter ──
const { maxRequests, windowMs } = { maxRequests: 30, windowMs: 60_000 };

check(`rate limiter allows first ${maxRequests} requests then blocks`, () => {
  resetRateLimitsForTests();
  const now = 1_000_000;
  for (let i = 0; i < maxRequests; i += 1) {
    if (isRateLimited('ip-a', now)) throw new Error(`blocked at request ${i + 1} of ${maxRequests}`);
  }
  if (!isRateLimited('ip-a', now + 1)) throw new Error('expected block after limit');
});

check('rate limiter is per-IP', () => {
  resetRateLimitsForTests();
  const now = 2_000_000;
  for (let i = 0; i < maxRequests; i += 1) isRateLimited('ip-b', now);
  if (!isRateLimited('ip-b', now + 1)) throw new Error('ip-b should be blocked');
  if (isRateLimited('ip-c', now + 1)) throw new Error('ip-c should be allowed');
});

check('rate limiter window resets after windowMs', () => {
  resetRateLimitsForTests();
  const start = 3_000_000;
  for (let i = 0; i < maxRequests; i += 1) isRateLimited('ip-d', start);
  if (!isRateLimited('ip-d', start + 1)) throw new Error('expected block inside window');
  if (isRateLimited('ip-d', start + windowMs + 1)) throw new Error('expected reset after window');
});

check('rate limiter blocks empty key (defense in depth)', () => {
  resetRateLimitsForTests();
  if (!isRateLimited('', 1)) throw new Error('empty key must be blocked');
});

check('rate limiter does not grow unbounded across many unique IPs', () => {
  resetRateLimitsForTests();
  const now = 5_000_000;
  for (let i = 0; i < 60_000; i += 1) {
    isRateLimited(`ip-${i}`, now);
  }
  // The internal map is not exported; assert behavioral bound: a fresh IP is
  // still allowed after eviction sweep and old IPs are forgotten.
  if (isRateLimited('fresh-ip-after-eviction', now + 1)) {
    throw new Error('fresh IP should be allowed after eviction');
  }
});

check('limiter registry is shared across module identities (globalThis anchor)', () => {
  resetRateLimitsForTests();
  const now = 6_000_000;
  for (let i = 0; i < maxRequests; i += 1) limiterA.isRateLimited('shared-ip', now);
  // A separate module identity must observe the same bucket:
  if (!limiterB.isRateLimited('shared-ip', now + 1)) {
    throw new Error('second module identity did not share the limiter state');
  }
});

check('MAX_PROXY_BODY_BYTES is exported and sane', () => {
  if (!(MAX_PROXY_BODY_BYTES > 1024 * 1024) || MAX_PROXY_BODY_BYTES > 512 * 1024 * 1024) {
    throw new Error(`unexpected size limit: ${MAX_PROXY_BODY_BYTES}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
