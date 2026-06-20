import { NextRequest, NextResponse } from 'next/server';

type WebFallbackResult = {
  title: string;
  link: string;
  type: 'pdf' | 'txt';
};

type WebFallbackCacheEntry = {
  results: WebFallbackResult[];
  expiresAt: number;
};

type ArchiveSearchDoc = {
  creator?: string | string[];
  identifier?: string;
  title?: string;
};

type ArchiveSearchResponse = {
  response?: {
    docs?: ArchiveSearchDoc[];
  };
};

type ArchiveMetadataFile = {
  format?: string;
  name?: string;
};

type ArchiveMetadataResponse = {
  files?: ArchiveMetadataFile[];
};

const WEB_FALLBACK_CACHE_TTL_MS = 1000 * 60 * 30;
const webFallbackCache = new Map<string, WebFallbackCacheEntry>();

function makeArchiveSearchURL(query: string) {
  const params = new URLSearchParams({
    q: `title:(${query}) AND mediatype:(texts)`,
    rows: '8',
    page: '1',
    output: 'json',
    sort: 'downloads desc',
  });

  ['title', 'identifier', 'creator'].forEach((field) => {
    params.append('fl[]', field);
  });

  return `https://archive.org/advancedsearch.php?${params.toString()}`;
}

function normalizeSearchText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

function getMeaningfulQueryTokens(query: string) {
  const ignoredTokens = new Set(['book', 'books', 'ebook', 'ebooks', 'filetype', 'pdf', 'txt']);
  return normalizeSearchText(query)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !ignoredTokens.has(token));
}

function matchesQuery(doc: ArchiveSearchDoc, query: string) {
  const tokens = getMeaningfulQueryTokens(query);
  if (tokens.length === 0) {
    return true;
  }

  const haystack = normalizeSearchText(`${doc.title ?? ''} ${getCreatorLabel(doc.creator)}`);
  return tokens.every((token) => haystack.includes(token));
}

function getCachedResults(query: string) {
  const cached = webFallbackCache.get(query);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    webFallbackCache.delete(query);
    return null;
  }

  return cached.results;
}

function getCreatorLabel(creator: ArchiveSearchDoc['creator']) {
  if (Array.isArray(creator)) {
    return creator.filter(Boolean).slice(0, 2).join(', ');
  }

  return creator ?? '';
}

function pickReadableArchiveFile(files: ArchiveMetadataFile[] = []) {
  const textFile = files.find((file) => file.name?.endsWith('_djvu.txt'));
  if (textFile?.name) {
    return { name: textFile.name, type: 'txt' as const };
  }

  const pdfFile = files.find((file) => {
    const name = file.name?.toLowerCase() ?? '';
    const format = file.format?.toLowerCase() ?? '';
    return name.endsWith('.pdf') || format.includes('pdf');
  });

  if (pdfFile?.name) {
    return { name: pdfFile.name, type: 'pdf' as const };
  }

  return null;
}

async function mapArchiveDocToResult(doc: ArchiveSearchDoc) {
  if (!doc.identifier || !doc.title) {
    return null;
  }

  const metadataResponse = await fetch(
    `https://archive.org/metadata/${encodeURIComponent(doc.identifier)}`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PAGE.OS/1.0 (web fallback)',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    },
  );

  if (!metadataResponse.ok) {
    return null;
  }

  const metadata = (await metadataResponse.json()) as ArchiveMetadataResponse;
  const readableFile = pickReadableArchiveFile(metadata.files);

  if (!readableFile) {
    return null;
  }

  const creator = getCreatorLabel(doc.creator);
  return {
    title: creator ? `${doc.title} - ${creator}` : doc.title,
    link: `https://archive.org/download/${encodeURIComponent(doc.identifier)}/${encodeURIComponent(readableFile.name)}`,
    type: readableFile.type,
  } satisfies WebFallbackResult;
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim();
  if (!query) {
    return NextResponse.json({ error: 'Query missing' }, { status: 400 });
  }

  const normalizedQuery = query.toLowerCase();
  const cachedResults = getCachedResults(normalizedQuery);

  if (cachedResults) {
    return NextResponse.json(cachedResults, {
      headers: {
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400',
      },
    });
  }

  try {
    const response = await fetch(makeArchiveSearchURL(query), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PAGE.OS/1.0 (web fallback)',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      throw new Error(`Internet Archive search failed with status: ${response.status}`);
    }

    const data = (await response.json()) as ArchiveSearchResponse;
    const docs = (data.response?.docs ?? []).filter((doc) => matchesQuery(doc, query));
    const mappedResults = await Promise.all(
      docs.slice(0, 8).map((doc) => mapArchiveDocToResult(doc).catch(() => null)),
    );
    const results = mappedResults
      .filter((result): result is WebFallbackResult => result !== null)
      .slice(0, 5);

    webFallbackCache.set(normalizedQuery, {
      results,
      expiresAt: Date.now() + WEB_FALLBACK_CACHE_TTL_MS,
    });

    return NextResponse.json(results, {
      headers: {
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('[Web Fallback] Search route failed:', error);
    return NextResponse.json(cachedResults ?? [], {
      headers: {
        'Cache-Control': 'public, max-age=120',
      },
    });
  }
}
