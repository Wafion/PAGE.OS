import type { MediaItem } from './types';

type CommonsCandidate = {
  fileName: string;
  title: string;
  creator: string;
  year: string;
  description?: string;
  country?: string;
  region?: string;
  culture?: string;
  period?: string;
  collection?: string;
  tags?: string[];
};

const WIKIDATA_COUNTRIES = [
  { id: 'Q668', label: 'India', region: 'South Asia' },
  { id: 'Q17', label: 'Japan', region: 'East Asia' },
  { id: 'Q148', label: 'China', region: 'East Asia' },
  { id: 'Q794', label: 'Iran', region: 'Middle East' },
  { id: 'Q79', label: 'Egypt', region: 'North Africa' },
  { id: 'Q1033', label: 'Nigeria', region: 'Africa' },
  { id: 'Q96', label: 'Mexico', region: 'Latin America' },
  { id: 'Q419', label: 'Peru', region: 'Latin America' },
  { id: 'Q155', label: 'Brazil', region: 'Latin America' },
  { id: 'Q159', label: 'Russia', region: 'Eastern Europe' },
  { id: 'Q142', label: 'France', region: 'Western Europe' },
  { id: 'Q38', label: 'Italy', region: 'Southern Europe' },
  { id: 'Q55', label: 'Netherlands', region: 'Western Europe' },
  { id: 'Q408', label: 'Australia', region: 'Oceania' },
];

const MET_SEARCH_TERMS = [
  { query: 'India painting', region: 'South Asia' },
  { query: 'Mughal painting', region: 'South Asia' },
  { query: 'Japan scroll', region: 'East Asia' },
  { query: 'China painting', region: 'East Asia' },
  { query: 'Persian miniature', region: 'Middle East' },
  { query: 'African sculpture', region: 'Africa' },
  { query: 'Mexico print', region: 'Latin America' },
  { query: 'European painting', region: 'Europe' },
];

const CLEVELAND_SEARCH_TERMS = [
  { query: 'india', region: 'South Asia' },
  { query: 'japan', region: 'East Asia' },
  { query: 'china', region: 'East Asia' },
  { query: 'iran', region: 'Middle East' },
  { query: 'africa', region: 'Africa' },
  { query: 'mexico', region: 'Latin America' },
  { query: 'europe', region: 'Europe' },
];

const REGION_ALIASES: Record<string, string> = {
  india: 'South Asia',
  pakistan: 'South Asia',
  nepal: 'South Asia',
  'sri lanka': 'South Asia',
  bangladesh: 'South Asia',
  japan: 'East Asia',
  china: 'East Asia',
  korea: 'East Asia',
  iran: 'Middle East',
  persia: 'Middle East',
  turkey: 'Middle East',
  iraq: 'Middle East',
  egypt: 'North Africa',
  morocco: 'North Africa',
  nigeria: 'Africa',
  ghana: 'Africa',
  ethiopia: 'Africa',
  kenya: 'Africa',
  mexico: 'Latin America',
  peru: 'Latin America',
  brazil: 'Latin America',
  colombia: 'Latin America',
  france: 'Western Europe',
  netherlands: 'Western Europe',
  italy: 'Southern Europe',
  spain: 'Southern Europe',
  germany: 'Central Europe',
  russia: 'Eastern Europe',
  australia: 'Oceania',
  'new zealand': 'Oceania',
  'united states': 'North America',
  canada: 'North America',
};

function stripHtml(value?: string): string {
  return (value ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeRegion(...parts: Array<string | undefined>): string | undefined {
  for (const part of parts) {
    const cleaned = stripHtml(part).toLowerCase();
    if (!cleaned) continue;
    if (REGION_ALIASES[cleaned]) {
      return REGION_ALIASES[cleaned];
    }

    for (const [key, region] of Object.entries(REGION_ALIASES)) {
      if (cleaned.includes(key)) {
        return region;
      }
    }
  }

  return undefined;
}

function dedupeItems(items: MediaItem[]): MediaItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.sourceRecordId || item.id || item.sourceUrl || item.url;
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PAGE.OS/1.0 (+public-domain-art-feed)',
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function chunkArray<T>(items: T[], size: number): T[][];
function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function pickEvenly<T>(items: T[], limit: number): T[] {
  if (items.length <= limit) {
    return items;
  }

  const step = items.length / limit;
  return Array.from({ length: limit }, (_, index) => items[Math.floor(index * step)]).filter(Boolean);
}

function extractCommonsFileName(url: string): string | null {
  try {
    const parsed = new URL(url);
    const marker = '/Special:FilePath/';
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) {
      return null;
    }

    return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

function isCommonsPublicDomain(extmetadata: Record<string, { value?: string }> | undefined): boolean {
  const values = [
    extmetadata?.LicenseShortName?.value,
    extmetadata?.UsageTerms?.value,
    extmetadata?.License?.value,
    extmetadata?.Copyrighted?.value,
  ]
    .map(stripHtml)
    .join(' ')
    .toLowerCase();

  if (!values) {
    return false;
  }

  if (values.includes('copyrighted') && !values.includes('public domain') && !values.includes('cc0')) {
    return false;
  }

  return (
    values.includes('public domain') ||
    values.includes('cc0') ||
    values.includes('pd-art') ||
    values.includes('mark 1.0')
  );
}

async function fetchCommonsMetadata(candidates: CommonsCandidate[]): Promise<MediaItem[]> {
  const byFileName = new Map<string, CommonsCandidate>();
  for (const candidate of candidates) {
    if (!byFileName.has(candidate.fileName)) {
      byFileName.set(candidate.fileName, candidate);
    }
  }

  const fileNames = [...byFileName.keys()];
  const results: MediaItem[] = [];

  for (const batch of chunkArray(fileNames, 20)) {
    const titles = batch.map((fileName) => `File:${fileName}`);
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      prop: 'imageinfo',
      iiprop: 'url|size|extmetadata',
      iiurlwidth: '900',
      titles: titles.join('|'),
    });

    const payload = await fetchJson<{
      query?: {
        pages?: Record<
          string,
          {
            title?: string;
            imageinfo?: Array<{
              url?: string;
              thumburl?: string;
              width?: number;
              height?: number;
              extmetadata?: Record<string, { value?: string }>;
            }>;
          }
        >;
      };
    }>(`https://commons.wikimedia.org/w/api.php?${params.toString()}`);

    const pages = payload?.query?.pages ?? {};
    for (const page of Object.values(pages)) {
      const title = page.title?.replace(/^File:/, '') ?? '';
      const image = page.imageinfo?.[0];
      const candidate = byFileName.get(title);
      if (!candidate || !image?.url || !isCommonsPublicDomain(image.extmetadata)) {
        continue;
      }

      results.push({
        id: `commons-${encodeURIComponent(title)}`,
        sourceRecordId: `commons:${title}`,
        url: image.thumburl || image.url,
        detailUrl: image.url,
        width: image.width || 900,
        height: image.height || 900,
        title: candidate.title,
        creator: candidate.creator,
        year: candidate.year,
        type: 'artwork',
        source: 'wikimedia',
        sourceName: 'Wikimedia Commons',
        sourceUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(title)}`,
        description: candidate.description,
        tags: candidate.tags,
        medium: stripHtml(image.extmetadata?.ObjectName?.value) || undefined,
        collection: candidate.collection,
        country: candidate.country,
        region: candidate.region || normalizeRegion(candidate.country, candidate.culture),
        culture: candidate.culture,
        period: candidate.period,
        attribution:
          stripHtml(image.extmetadata?.Credit?.value) ||
          [candidate.title, candidate.year, candidate.creator, 'Wikimedia Commons'].filter(Boolean).join('. '),
        rightsLabel: stripHtml(image.extmetadata?.LicenseShortName?.value) || 'Public Domain',
        licenseUrl: stripHtml(image.extmetadata?.LicenseUrl?.value) || undefined,
      });
    }
  }

  return results;
}

async function fetchFromWikidataCommons(): Promise<MediaItem[]> {
  const countryValues = WIKIDATA_COUNTRIES.map((entry) => `wd:${entry.id}`).join(' ');
  const sparql = `
SELECT ?item ?itemLabel ?creatorLabel ?image ?inception ?collectionLabel ?countryLabel ?cultureLabel ?periodLabel WHERE {
  VALUES ?country { ${countryValues} }
  ?item wdt:P31/wdt:P279* wd:Q838948;
        wdt:P18 ?image.
  { ?item wdt:P495 ?country. } UNION { ?item wdt:P17 ?country. }
  OPTIONAL { ?item wdt:P170 ?creator. }
  OPTIONAL { ?item wdt:P571 ?inception. }
  OPTIONAL { ?item wdt:P195 ?collection. }
  OPTIONAL { ?item wdt:P172 ?culture. }
  OPTIONAL { ?item wdt:P2348 ?period. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 180
`.trim();

  const params = new URLSearchParams({
    query: sparql,
    format: 'json',
  });

  const payload = await fetchJson<{
    results?: {
      bindings?: Array<Record<string, { value?: string }>>;
    };
  }>(`https://query.wikidata.org/sparql?${params.toString()}`, {
    headers: {
      Accept: 'application/sparql-results+json',
    },
  });

  const candidates = (payload?.results?.bindings ?? []).reduce<CommonsCandidate[]>((accumulator, entry) => {
      const imageUrl = entry.image?.value ?? '';
      const fileName = extractCommonsFileName(imageUrl);
      if (!fileName) {
        return accumulator;
      }

      const country = stripHtml(entry.countryLabel?.value) || undefined;
      const mappedRegion = WIKIDATA_COUNTRIES.find((item) => item.label === country)?.region;
      accumulator.push({
        fileName,
        title: stripHtml(entry.itemLabel?.value) || 'Untitled work',
        creator: stripHtml(entry.creatorLabel?.value) || 'Unknown Artist',
        year: stripHtml(entry.inception?.value)?.slice(0, 4) || '',
        country,
        region: mappedRegion || normalizeRegion(country),
        culture: stripHtml(entry.cultureLabel?.value) || undefined,
        period: stripHtml(entry.periodLabel?.value) || undefined,
        collection: stripHtml(entry.collectionLabel?.value) || undefined,
      });
      return accumulator;
    }, []);

  return fetchCommonsMetadata(candidates);
}

async function fetchFromMet(): Promise<MediaItem[]> {
  const items: MediaItem[] = [];

  for (const entry of MET_SEARCH_TERMS) {
    const searchParams = new URLSearchParams({
      q: entry.query,
      hasImages: 'true',
    });
    const search = await fetchJson<{ objectIDs?: number[] }>(
      `https://collectionapi.metmuseum.org/public/collection/v1/search?${searchParams.toString()}`,
    );
    const sampledIds = pickEvenly((search?.objectIDs ?? []).slice(0, 48), 6);
    if (sampledIds.length === 0) {
      continue;
    }

    const batchResults = await Promise.all(
      sampledIds.map(async (id) => {
        const data = await fetchJson<{
          objectID: number;
          title?: string;
          artistDisplayName?: string;
          objectDate?: string;
          primaryImage?: string;
          primaryImageSmall?: string;
          primaryImageSmallWidth?: number;
          primaryImageSmallHeight?: number;
          classification?: string;
          isPublicDomain?: boolean;
          objectURL?: string;
          objectName?: string;
          creditLine?: string;
          culture?: string;
          period?: string;
          medium?: string;
          dimensions?: string;
          repository?: string;
          department?: string;
          accessionNumber?: string;
          country?: string;
          region?: string;
          tags?: Array<{ term?: string }>;
        }>(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);

        if (!data?.primaryImageSmall || data.isPublicDomain !== true || !data.title) {
          return null;
        }

        return {
          id: `met-${data.objectID}`,
          sourceRecordId: `met:${data.objectID}`,
          url: data.primaryImageSmall,
          detailUrl: data.primaryImage || data.primaryImageSmall,
          width: data.primaryImageSmallWidth || 500,
          height: data.primaryImageSmallHeight || 500,
          title: data.title,
          creator: data.artistDisplayName || 'Unknown Artist',
          year: data.objectDate || '',
          type: 'artwork' as const,
          source: 'met',
          sourceName: 'The Metropolitan Museum of Art',
          sourceUrl: data.objectURL || 'https://www.metmuseum.org/art/collection',
          description: data.creditLine || data.objectName || '',
          tags: [data.classification, data.culture, ...(data.tags ?? []).map((tag) => tag.term || '')]
            .filter((value): value is string => Boolean(value))
            .slice(0, 6),
          medium: data.medium || undefined,
          dimensions: data.dimensions || undefined,
          location: data.repository || 'The Metropolitan Museum of Art',
          collection: data.department || 'Open Access Collection',
          accessionNumber: data.accessionNumber || undefined,
          creditLine: data.creditLine || undefined,
          country: data.country || undefined,
          region: normalizeRegion(data.region, data.country, data.culture) || entry.region,
          culture: data.culture || undefined,
          period: data.period || undefined,
          attribution: [data.title, data.objectDate, data.artistDisplayName, 'The Metropolitan Museum of Art']
            .filter(Boolean)
            .join('. '),
          rightsLabel: 'Public Domain',
          licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
        };
      }),
    );

    for (const item of batchResults) {
      if (item) {
        items.push(item);
      }
    }
  }

  return items;
}

async function fetchFromCleveland(): Promise<MediaItem[]> {
  const items: MediaItem[] = [];

  for (const entry of CLEVELAND_SEARCH_TERMS) {
    const params = new URLSearchParams({
      q: entry.query,
      limit: '10',
      cc0: '1',
      has_image: '1',
    });

    const payload = await fetchJson<{
      data?: Array<{
        id: number;
        title?: string;
        creation_date?: string;
        creators?: Array<{ description?: string }>;
        images?: {
          web?: { url?: string; width?: number; height?: number };
          print?: { url?: string };
        };
        culture?: Array<string>;
        technique?: string;
        type?: string;
        collection?: string;
        department?: string;
        accession_number?: string;
        creditline?: string;
        share_license_status?: string;
        url?: string;
        description?: string;
        tombstone?: string;
        place?: string;
        century?: string;
      }>;
    }>(`https://openaccess-api.clevelandart.org/api/artworks/?${params.toString()}`);

    for (const artwork of payload?.data ?? []) {
      const image = artwork.images?.web;
      if (!image?.url || artwork.share_license_status !== 'CC0' || !artwork.title) {
        continue;
      }

      const culture = artwork.culture?.join(', ') || undefined;
      items.push({
        id: `cma-${artwork.id}`,
        sourceRecordId: `cma:${artwork.id}`,
        url: image.url,
        detailUrl: artwork.images?.print?.url || image.url,
        width: image.width || 900,
        height: image.height || 900,
        title: artwork.title,
        creator: stripHtml(artwork.creators?.[0]?.description) || 'Unknown Artist',
        year: artwork.creation_date || '',
        type: 'artwork',
        source: 'cleveland',
        sourceName: 'Cleveland Museum of Art',
        sourceUrl: artwork.url || 'https://www.clevelandart.org/',
        description: stripHtml(artwork.description) || stripHtml(artwork.tombstone) || undefined,
        tags: [artwork.type, culture, artwork.century].filter((value): value is string => Boolean(value)).slice(0, 6),
        medium: artwork.technique || undefined,
        collection: artwork.collection || artwork.department || 'Open Access Collection',
        accessionNumber: artwork.accession_number || undefined,
        creditLine: artwork.creditline || undefined,
        country: artwork.place || undefined,
        region: normalizeRegion(artwork.place, culture) || entry.region,
        culture,
        period: artwork.century || undefined,
        attribution: [artwork.title, artwork.creation_date, stripHtml(artwork.creators?.[0]?.description), 'Cleveland Museum of Art']
          .filter(Boolean)
          .join('. '),
        rightsLabel: 'CC0',
        licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      });
    }
  }

  return items;
}

function getSeededArtworks(): MediaItem[] {
  return [
    {
      id: 'seed-starry-night',
      sourceRecordId: 'seed:starry-night',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/900px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
      detailUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
      width: 900,
      height: 716,
      title: 'The Starry Night',
      creator: 'Vincent van Gogh',
      year: '1889',
      type: 'artwork',
      source: 'wikimedia',
      sourceName: 'Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
      medium: 'Oil on canvas',
      region: 'Western Europe',
      rightsLabel: 'Public Domain',
    },
    {
      id: 'seed-scream',
      sourceRecordId: 'seed:scream',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/The_Scream.jpg/900px-The_Scream.jpg',
      detailUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f4/The_Scream.jpg',
      width: 900,
      height: 1135,
      title: 'The Scream',
      creator: 'Edvard Munch',
      year: '1893',
      type: 'artwork',
      source: 'wikimedia',
      sourceName: 'Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:The_Scream.jpg',
      medium: 'Oil, tempera and pastel on cardboard',
      region: 'Northern Europe',
      rightsLabel: 'Public Domain',
    },
    {
      id: 'seed-mona-lisa',
      sourceRecordId: 'seed:mona-lisa',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/900px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg',
      detailUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg',
      width: 900,
      height: 1243,
      title: 'Mona Lisa',
      creator: 'Leonardo da Vinci',
      year: '1503',
      type: 'artwork',
      source: 'wikimedia',
      sourceName: 'Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg',
      medium: 'Oil on panel',
      region: 'Southern Europe',
      rightsLabel: 'Public Domain',
    },
  ];
}

export async function hydratePool(): Promise<{ added: number; total: number }> {
  const [wikidataCommons, met, cleveland] = await Promise.all([
    fetchFromWikidataCommons(),
    fetchFromMet(),
    fetchFromCleveland(),
  ]);

  const merged = dedupeItems([
    ...getSeededArtworks(),
    ...wikidataCommons,
    ...met,
    ...cleveland,
  ]).map((item) => ({
    ...item,
    region: item.region || normalizeRegion(item.country, item.culture, item.collection),
    rightsLabel: item.rightsLabel || 'Public Domain',
  }));

  const { GlobalPool } = await import('./global-pool');
  return await GlobalPool.getInstance().addItems(merged);
}
