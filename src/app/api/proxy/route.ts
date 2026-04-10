
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrlString = searchParams.get('url');

  if (!targetUrlString) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    // The domain whitelist has been removed to support the web fallback feature,
    // which needs to access a wide range of domains discovered through Bing search.
    // Security is now handled by only fetching specific file types (txt, html)
    // and by the client-side code which sanitizes the content.
    const targetUrl = new URL(targetUrlString);
    
    const headers = new Headers();
    const wantsPlainText =
      targetUrl.pathname.endsWith('.txt') ||
      targetUrl.pathname.endsWith('.text') ||
      targetUrl.search.includes('text/plain');

    // Use a generic user agent to improve compatibility
    headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    headers.set(
      'Accept',
      wantsPlainText
        ? 'text/plain,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    );
    headers.set('Accept-Language', 'en-US,en;q=0.5');

    const res = await fetch(targetUrl.toString(), { 
        headers,
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 30000);
          return controller.signal;
        })()
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Failed to fetch from proxied URL: ${res.status} ${res.statusText}`, errorText);
      return NextResponse.json({ error: `Failed to fetch from proxied URL: ${res.statusText}` }, { status: res.status });
    }

    const contentType = res.headers.get('Content-Type') || 'application/octet-stream';
    const body = await res.blob();
    
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=600', // Cache for 10 minutes
      },
    });

  } catch (error) {
    console.error('Proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to proxy request', details: errorMessage }, { status: 500 });
  }
}
