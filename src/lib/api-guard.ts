/**
 * Shared guard for PAGE.OS API routes: per-IP rate limiting plus simple,
 * uniform parameter validation. Every public API route calls `guardRequest`
 * first; a non-null return value is the response to send immediately.
 */

import { NextResponse } from 'next/server';
import { getClientIp, isRateLimited, type RateLimitConfig } from '@/lib/rate-limit';

const DEFAULT_LIMIT: RateLimitConfig = { maxRequests: 300, windowMs: 60_000 };

export type ParamRule = {
  name: string;
  required?: boolean;
  maxLength?: number;
  pattern?: RegExp;
  /** Human-readable constraint description included in 400 responses. */
  description?: string;
};

export type GuardResult = { response: null } | { response: NextResponse };

function error(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Returns `{ response: null }` when the request may proceed, otherwise a
 * ready-to-send 429/400 response.
 */
export function guardRequest(
  request: Request,
  options: { rules?: ParamRule[]; limit?: RateLimitConfig } = {},
): GuardResult {
  const ip = getClientIp(request);
  if (isRateLimited(ip, Date.now(), options.limit ?? DEFAULT_LIMIT)) {
    return { response: error('Too many requests', 429) };
  }

  const url = new URL(request.url);
  for (const rule of options.rules ?? []) {
    const value = url.searchParams.get(rule.name);
    const present = value !== null && value.trim().length > 0;

    if (rule.required && !present) {
      return { response: error(`${rule.name} parameter is required`, 400) };
    }
    if (!present) continue;

    const trimmed = value!.trim();
    if (rule.maxLength && trimmed.length > rule.maxLength) {
      return {
        response: error(
          `${rule.name} must be at most ${rule.maxLength} characters${rule.description ? ` (${rule.description})` : ''}`,
          400,
        ),
      };
    }
    if (rule.pattern && !rule.pattern.test(trimmed)) {
      return {
        response: error(
          `${rule.name} is invalid${rule.description ? `: ${rule.description}` : ''}`,
          400,
        ),
      };
    }
  }

  return { response: null };
}
