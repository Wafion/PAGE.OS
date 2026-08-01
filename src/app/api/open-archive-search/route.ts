import { NextRequest, NextResponse } from 'next/server';

type ArchiveSearchDoc = {
  identifier?: string;
  title?: string | string[];
  creator?: string | string[];
  subject?: string | string[];
  date?: string;
  year?: string;
  licenseurl?: string;
  rights?: string;
  collection?: string | string[];
};

type ArchiveSearchResponse = {
  response?: {
    docs?: ArchiveSearchDoc[];
  };
};

type ArchiveMetadataFile = {
  name?: string;
  format?: string;
  source?: string;
  size?: string;
};

type ArchiveMetadataResponse = {
  files?: ArchiveMetadataFile[];
};

type WikisourceSearchResponse = {
  query?: {
    search?: Array<{ pageid: number; title: string; ns: number }>;
  };
};

type GoogleBooksResponse = {
  items?: Array<{
    id: string;
    volumeInfo?: { title?: string; authors?: string[] };
    accessInfo?: {
      publicDomain?: boolean;
      pdf?: { isAvailable?: boolean; downloadLink?: string };
      infoLink?: string;
    };
  }>;
};

type OpenTextResult = {
  id: string;
  title: string;
  link: string;
  type: 'txt' | 'pdf';
  sourceName: string;
  rightsLabel: string;
  detailUrl: string;
};

const OPEN_RIGHTS_QUERY = [
  'collection:gutenberg',
  'collection:opensource',
  'collection:internetarchivebooks',
  'licenseurl:"http://creativecommons.org/publicdomain/mark/1.0/"',
  'licenseurl:"https://creativecommons.org/publicdomain/zero/1.0/"',
  'rights:"Public Domain"',
].join(' OR ');

function normalizeText(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(', ');
  }

  return value?.trim() ?? '';
}

function buildArchiveQuery(query: string) {
  const safeQuery = query.replace(/[()[\]{}"]/g, ' ').replace(/\s+/g, ' ').trim();
  return `mediatype:texts AND (title:(${safeQuery}) OR creator:(${safeQuery}) OR subject:(${safeQuery})) AND (${OPEN_RIGHTS_QUERY})`;
}

function matchesBibliographicQuery(doc: ArchiveSearchDoc, query: string) {
  const haystack = [doc.title, doc.creator, doc.subject]
    .map(normalizeText)
    .join(' ')
    .toLocaleLowerCase();
  const terms = query.toLocaleLowerCase().split(/\s+/).filter((term) => term.length > 1);
  return terms.length > 0 && terms.some((term) => haystack.includes(term));
}

function getDownloadUrl(identifier: string, fileName: string) {
  return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(fileName)}`;
}

function getReadableFiles(files: ArchiveMetadataFile[] | undefined) {
  if (!files) {
    return [] as Array<{ name: string; type: 'txt' | 'pdf' }>;
  }

  const readableFiles = files.filter((file) => {
    const name = file.name?.toLowerCase() ?? '';
    return Boolean(
      file.name &&
      file.source !== 'metadata' &&
      !name.includes('scandata') &&
      !name.endsWith('_djvu.xml') &&
      !name.endsWith('.json') &&
      !name.endsWith('.xml'),
    );
  });
  const supportedFiles = readableFiles.filter((file) => {
    const name = file.name?.toLowerCase() ?? '';
    const format = file.format?.toLowerCase() ?? '';
    return name.endsWith('.txt') || format === 'text' || format === 'djvutxt' || name.endsWith('.pdf') || format.includes('pdf');
  });

  // Preserve the archive's own file order and surface every supported
  // rendition; PAGE.OS does not rank TXT over PDF (or vice versa).
  return supportedFiles
    .filter((file): file is ArchiveMetadataFile & { name: string } => Boolean(file.name))
    .map((file) => ({
      name: file.name,
      type: (file.name.toLowerCase().endsWith('.pdf') || file.format?.toLowerCase().includes('pdf'))
        ? 'pdf' as const
        : 'txt' as const,
    }))
    .filter((file, index, all) => all.findIndex((candidate) => candidate.name === file.name) === index);
}

async function fetchArchiveJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'PAGE.OS/1.0 (+open-knowledge-gateway)',
    },
    signal: AbortSignal.timeout(12000),
    next: { revalidate: 600 },
  });

  if (!response.ok) {
    throw new Error(`Internet Archive request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function fetchWikisourceResults(query: string): Promise<OpenTextResult[]> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: query,
    srnamespace: '0',
    srlimit: '5',
    format: 'json',
    formatversion: '2',
  });
  const response = await fetch(`https://en.wikisource.org/w/api.php?${params.toString()}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'PAGE.OS/1.0 (+open-knowledge-gateway)' },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 600 },
  });

  if (!response.ok) {
    throw new Error(`Wikisource request failed: ${response.status}`);
  }

  const payload = (await response.json()) as WikisourceSearchResponse;
  return (payload.query?.search ?? [])
    .filter((entry) => entry.ns === 0 && entry.title)
    .map((entry) => {
      const pagePath = entry.title.replace(/ /g, '_');
      const link = `https://en.wikisource.org/wiki/${encodeURIComponent(pagePath)}`;
      return {
        id: `wikisource:${entry.pageid}`,
        title: entry.title,
        link,
        type: 'txt' as const,
        sourceName: 'Wikisource',
        rightsLabel: 'Open source text',
        detailUrl: link,
      };
    });
}

async function fetchGoogleBooksResults(query: string): Promise<OpenTextResult[]> {
  const params = new URLSearchParams({
    q: query,
    filter: 'full',
    maxResults: '10',
    projection: 'full',
  });
  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'PAGE.OS/1.0 (+open-knowledge-gateway)' },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 600 },
  });

  if (!response.ok) {
    throw new Error(`Google Books request failed: ${response.status}`);
  }

  const payload = (await response.json()) as GoogleBooksResponse;
  return (payload.items ?? [])
    .filter((item) => item.accessInfo?.publicDomain && item.accessInfo.pdf?.isAvailable && item.accessInfo.pdf.downloadLink)
    .map((item) => ({
      id: `google-books:${item.id}`,
      title: `${item.volumeInfo?.title || 'Untitled'} (PDF)`,
      link: item.accessInfo!.pdf!.downloadLink!,
      type: 'pdf' as const,
      sourceName: 'Google Books public domain',
      rightsLabel: 'Public domain',
      detailUrl: item.accessInfo?.infoLink || `https://books.google.com/books?id=${encodeURIComponent(item.id)}`,
    }));
}

function mergeSourceResults(groups: OpenTextResult[][], limit = 15) {
  const merged: OpenTextResult[] = [];
  for (let index = 0; merged.length < limit; index += 1) {
    let added = false;
    for (const group of groups) {
      if (group[index]) {
        merged.push(group[index]);
        added = true;
        if (merged.length === limit) break;
      }
    }
    if (!added) break;
  }
  return merged;
}

function decodeXmlText(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

async function fetchGutenbergOpdsResults(query: string): Promise<OpenTextResult[]> {
  const response = await fetch(
    `https://www.gutenberg.org/ebooks/search.opds/?query=${encodeURIComponent(query)}`,
    {
      headers: { Accept: 'application/atom+xml;profile=opds-catalog', 'User-Agent': 'PAGE.OS/1.0 (+open-knowledge-gateway)' },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 600 },
    },
  );
  if (!response.ok) {
    throw new Error(`Project Gutenberg OPDS request failed: ${response.status}`);
  }

  const xml = await response.text();
  const entries = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g));
  return entries.flatMap((match) => {
    const entry = match[1];
    const id = entry.match(/<id>https:\/\/www\.gutenberg\.org\/ebooks\/(\d+)\.opds<\/id>/)?.[1];
    const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    if (!id || !title) return [];
    const author = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1];
    return [{
      id: `gutenberg-opds:${id}`,
      title: decodeXmlText(title),
      link: `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
      type: 'txt' as const,
      sourceName: 'Project Gutenberg',
      rightsLabel: decodeXmlText(author || 'Public domain'),
      detailUrl: `https://www.gutenberg.org/ebooks/${id}`,
    }];
  });
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'Query missing' }, { status: 400 });
  }

  const wikisourcePromise = fetchWikisourceResults(query);
  const googleBooksPromise = fetchGoogleBooksResults(query);
  const gutenbergOpdsPromise = fetchGutenbergOpdsResults(query);

  try {
    const params = new URLSearchParams({
      q: buildArchiveQuery(query),
      rows: '10',
      page: '1',
      output: 'json',
      sort: 'downloads desc',
    });

    ['identifier', 'title', 'creator', 'subject', 'date', 'year', 'licenseurl', 'rights', 'collection'].forEach((field) => {
      params.append('fl[]', field);
    });

    const search = await fetchArchiveJson<ArchiveSearchResponse>(
      `https://archive.org/advancedsearch.php?${params.toString()}`,
    );

    const docs = search.response?.docs?.filter(
      (doc) => doc.identifier && matchesBibliographicQuery(doc, query),
    ) ?? [];
    const hydrated = await Promise.all(
      docs.slice(0, 8).map(async (doc) => {
        const identifier = doc.identifier!;
        const metadata = await fetchArchiveJson<ArchiveMetadataResponse>(
          `https://archive.org/metadata/${encodeURIComponent(identifier)}`,
        );
        const readableFiles = getReadableFiles(metadata.files);

        if (readableFiles.length === 0) {
          return null;
        }

        return readableFiles.map((readableFile) => ({
          id: `${identifier}/${readableFile.name}`,
          title: `${normalizeText(doc.title) || identifier} (${readableFile.type.toUpperCase()})`,
          link: getDownloadUrl(identifier, readableFile.name),
          type: readableFile.type,
          sourceName: 'Internet Archive',
          rightsLabel: normalizeText(doc.rights) || normalizeText(doc.licenseurl) || 'Open access',
          detailUrl: `https://archive.org/details/${encodeURIComponent(identifier)}`,
        }));
      }),
    );

    const wikisourceResults = await wikisourcePromise.catch((error) => {
      console.warn('[Wikisource Search] An error occurred:', error);
      return [] as OpenTextResult[];
    });
    const googleBooksResults = await googleBooksPromise.catch((error) => {
      console.warn('[Google Books Search] An error occurred:', error);
      return [] as OpenTextResult[];
    });
    const gutenbergOpdsResults = await gutenbergOpdsPromise.catch((error) => {
      console.warn('[Project Gutenberg OPDS] An error occurred:', error);
      return [] as OpenTextResult[];
    });

    return NextResponse.json(mergeSourceResults([
      hydrated.flatMap((result) => result ?? []),
      googleBooksResults,
      gutenbergOpdsResults,
      wikisourceResults,
    ]));
  } catch (error) {
    console.error('[Open Archive Search] An error occurred:', error);
    const wikisourceResults = await wikisourcePromise.catch((wikisourceError) => {
      console.warn('[Wikisource Search] An error occurred:', wikisourceError);
      return [] as OpenTextResult[];
    });
    const googleBooksResults = await googleBooksPromise.catch((googleBooksError) => {
      console.warn('[Google Books Search] An error occurred:', googleBooksError);
      return [] as OpenTextResult[];
    });
    const gutenbergOpdsResults = await gutenbergOpdsPromise.catch((gutenbergError) => {
      console.warn('[Project Gutenberg OPDS] An error occurred:', gutenbergError);
      return [] as OpenTextResult[];
    });
    const fallbackResults = mergeSourceResults([googleBooksResults, gutenbergOpdsResults, wikisourceResults]);
    if (fallbackResults.length > 0) {
      return NextResponse.json(fallbackResults);
    }
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';

    return NextResponse.json(
      { error: 'Failed to search open archives', details: errorMessage },
      { status: 500 },
    );
  }
}
