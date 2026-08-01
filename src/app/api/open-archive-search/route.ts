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

function chooseReadableFile(files: ArchiveMetadataFile[] | undefined) {
  if (!files) {
    return null;
  }

  const readableFiles = files.filter((file) => {
    const name = file.name?.toLowerCase() ?? '';
    return Boolean(
      file.name &&
      file.source !== 'metadata' &&
      !name.includes('scandata') &&
      !name.endsWith('_djvu.xml') &&
      !name.endsWith('_text.pdf') &&
      !name.endsWith('.json') &&
      !name.endsWith('.xml'),
    );
  });
  const textFiles = readableFiles.filter((file) => {
    const name = file.name?.toLowerCase() ?? '';
    const format = file.format?.toLowerCase() ?? '';
    return name.endsWith('.txt') || format === 'text' || format === 'djvutxt';
  });

  // Prefer a publisher/plain-text transcription over OCR output. OCR remains a
  // fallback for archive items that do not contain another readable text file.
  const txt = textFiles.find((file) => !file.name?.toLowerCase().includes('_djvu')) ?? textFiles[0];

  if (txt?.name) {
    return { name: txt.name, type: 'txt' as const };
  }

  const pdf = readableFiles.find((file) => {
    const name = file.name?.toLowerCase() ?? '';
    const format = file.format?.toLowerCase() ?? '';
    return name.endsWith('.pdf') || format.includes('pdf');
  });

  if (pdf?.name) {
    return { name: pdf.name, type: 'pdf' as const };
  }

  return null;
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

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'Query missing' }, { status: 400 });
  }

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
        const readableFile = chooseReadableFile(metadata.files);

        if (!readableFile) {
          return null;
        }

        return {
          id: `${identifier}/${readableFile.name}`,
          title: normalizeText(doc.title) || identifier,
          link: getDownloadUrl(identifier, readableFile.name),
          type: readableFile.type,
          sourceName: 'Internet Archive',
          rightsLabel: normalizeText(doc.rights) || normalizeText(doc.licenseurl) || 'Open access',
          detailUrl: `https://archive.org/details/${encodeURIComponent(identifier)}`,
        };
      }),
    );

    return NextResponse.json(hydrated.filter(Boolean).slice(0, 5));
  } catch (error) {
    console.error('[Open Archive Search] An error occurred:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';

    return NextResponse.json(
      { error: 'Failed to search open archives', details: errorMessage },
      { status: 500 },
    );
  }
}
