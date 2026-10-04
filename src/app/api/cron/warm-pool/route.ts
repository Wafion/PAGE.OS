import { NextRequest, NextResponse } from 'next/server';
import { hydratePool } from '@/app/api/media-feed/resolvers';
import { GlobalPool } from '@/app/api/media-feed/global-pool';

export const maxDuration = 60; // Allow sufficient time for museum API fetches on pro/hobby runtimes

/**
 * Scheduled background ingestion worker route.
 * Can be triggered via Vercel Cron, external cron services, or an asynchronous background task.
 * Protected by CRON_SECRET authorization header.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isDev = process.env.NODE_ENV !== 'production';

  // In production, require bearer token if CRON_SECRET is configured
  if (!isDev && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      const searchKey = request.nextUrl.searchParams.get('key');
      if (searchKey !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized worker invocation' }, { status: 401 });
      }
    }
  }

  const startTime = Date.now();
  try {
    const hydrationResult = await hydratePool();
    const durationMs = Date.now() - startTime;
    const poolManager = GlobalPool.getInstance();
    const metadata = await poolManager.getMetadata();

    return NextResponse.json({
      status: 'success',
      durationMs,
      added: hydrationResult.added,
      total: hydrationResult.total,
      sources: hydrationResult.sources,
      lastUpdated: metadata.lastUpdated,
      sourceCounts: metadata.sourceCounts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error('[PAGE.OS Warm-Pool Error]:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown hydration error',
        durationMs,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
