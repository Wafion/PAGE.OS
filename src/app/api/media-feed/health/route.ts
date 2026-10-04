import { NextResponse } from 'next/server';
import { GlobalPool } from '../global-pool';

export async function GET() {
  try {
    const poolManager = GlobalPool.getInstance();
    const pool = await poolManager.getPool();
    const metadata = await poolManager.getMetadata();
    const now = Date.now();
    const ageSeconds = Math.max(0, Math.floor((now - metadata.lastUpdated) / 1000));

    return NextResponse.json(
      {
        status: pool.length > 0 ? 'healthy' : 'degraded',
        poolSize: pool.length,
        lastUpdated: metadata.lastUpdated,
        cacheAgeSeconds: ageSeconds,
        sourceCounts: metadata.sourceCounts || {},
        canonicalFrontend: 'https://pageos.vercel.app',
        deploymentRole: 'primary-frontend',
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=120',
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to query pool health',
      },
      { status: 500 },
    );
  }
}
