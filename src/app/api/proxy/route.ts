import { NextRequest, NextResponse } from 'next/server';
import {
  MAX_PROXY_BODY_BYTES,
  isAllowedProxyDestination,
} from '@/lib/proxy-allowlist';
import { getClientIp, isRateLimited } from '@/lib/rate-limit';

const MAX_RETRIES = 2;
const BASE_TIMEOUT_MS = 15000;

/** Refused redirect destinations are 302'd here (hops are re-validated, never blindly followed). */
const SAFE_REDIRECT_TARGET = 'https://archive.org/';

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function proxyFetch(url: URL, attempt: number): Promise<Response> {
  const headers = new Headers();
  headers.set('User-Agent', 'PAGE.OS/1.0 (+open-knowledge-gateway)');
  headers.set('Accept', 'application/pdf,text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8');
  headers.set('Accept-Language', 'en-US,en;q=0.5');
  headers.set('Host', url.host);

  const timeout = BASE_TIMEOUT_MS + attempt * 5000;
  return fetch(url, {
    headers,
    signal: AbortSignal.timeout(timeout),
    redirect: 'manual',
  });
}

/**
 * Follows a redirect chain manually so every hop is re-validated against the
 * allowlist. Bounded by MAX_RETRIES hops.
 */
async function fetchFollowingValidatedRedirects(targetUrl: URL, attempt: number): Promise<Response> {
  let current = targetUrl;

  for (let hop = 0; hop < 5; hop += 1) {
    const res = await proxyFetch(current, attempt);

    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      if (!res.body) {
        return res;
      }
      await res.body.cancel();

      let next: URL;
      try {
        next = new URL(res.headers.get('location')!, current);
      } catch {
        throw new Error(`Invalid redirect target from ${current.hostname}`);
      }

      const check = isAllowedProxyDestination(next.toString());
      if (!check.allowed) {
        console.warn(`Proxy redirect to disallowed host blocked: ${next.hostname}`);
        return NextResponse.redirect(SAFE_REDIRECT_TARGET, 302);
      }
      current = next;
      continue;
    }

    return res;
  }

  throw new Error('Too many redirects');
}

function isContentLengthWithinLimit(res: Response): boolean {
  const header = res.headers.get('content-length');
  if (!header) return true;
  const parsed = Number.parseInt(header, 10);
  return Number.isNaN(parsed) || parsed <= MAX_PROXY_BODY_BYTES;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrlString = searchParams.get('url');

  if (!targetUrlString) {
    return errorResponse('URL parameter is required', 400);
  }

  const clientIp = getClientIp(request);
  if (isRateLimited(clientIp)) {
    return errorResponse('Too many requests', 429);
  }

  const check = isAllowedProxyDestination(targetUrlString);
  if (!check.allowed) {
    return errorResponse(check.reason, 400);
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(targetUrlString);
  } catch {
    return errorResponse('Invalid URL', 400);
  }

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchFollowingValidatedRedirects(targetUrl, attempt);

      if (res instanceof NextResponse) {
        return res;
      }

      if (res.ok) {
        if (!isContentLengthWithinLimit(res)) {
          return errorResponse('Resource exceeds proxy size limit', 413);
        }

        const contentType = res.headers.get('Content-Type') || 'application/octet-stream';
        const body = await res.blob();

        if (body.size > MAX_PROXY_BODY_BYTES) {
          return errorResponse('Resource exceeds proxy size limit', 413);
        }

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
        return errorResponse(`Resource not found: ${targetUrl.pathname}`, 404);
      }

      lastError = new Error(`HTTP ${res.status}`);
      console.warn(`Proxy attempt ${attempt + 1} failed for ${targetUrlString}: ${res.status}`);
    } catch (error) {
      lastError = error;
      console.warn(
        `Proxy attempt ${attempt + 1} error for ${targetUrlString}:`,
        error instanceof Error ? error.message : error,
      );
    }

    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }

  const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown error';
  console.error(`Proxy failed after ${MAX_RETRIES + 1} attempts for ${targetUrlString}: ${errorMessage}`);
  return errorResponse(`Source temporarily unavailable after retries: ${errorMessage}`, 503);
}
