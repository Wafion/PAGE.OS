import * as cheerio from 'cheerio';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MappedStandardEbooksBook = {
  id: string;               // slug like "herman-melville/moby-dick"
  title: string;
  authors: string;
  formats: {
    epub?: string;           // direct EPUB download URL
    text?: string;           // "read online" single-page XHTML URL
    web?: string;            // book page on standardebooks.org
    cover?: string;          // thumbnail cover image URL
  };
  source: 'standardebooks';
  subjects?: string[];
};

// ---------------------------------------------------------------------------
// Curated fallback list — well-known Standard Ebooks titles
// ---------------------------------------------------------------------------

function fallbackSE(
  id: string,
  title: string,
  authors: string,
  subjects: string[] = [],
): MappedStandardEbooksBook {
  return {
    id,
    title,
    authors,
    formats: {
      web: `https://standardebooks.org/ebooks/${id}`,
      text: `https://standardebooks.org/ebooks/${id}/text/single-page`,
      epub: `https://standardebooks.org/ebooks/${id}/downloads/${id.split('/').pop()}.epub`,
      cover: `https://standardebooks.org/ebooks/${id}/downloads/cover-thumbnail.jpg`,
    },
    source: 'standardebooks',
    subjects,
  };
}

export const FALLBACK_STANDARD_EBOOKS: MappedStandardEbooksBook[] = [
  fallbackSE('jane-austen/pride-and-prejudice', 'Pride and Prejudice', 'Jane Austen', ['romance', 'classic']),
  fallbackSE('mary-shelley/frankenstein-or-the-modern-prometheus', 'Frankenstein; Or, The Modern Prometheus', 'Mary Shelley', ['horror', 'science fiction', 'gothic']),
  fallbackSE('arthur-conan-doyle/the-adventures-of-sherlock-holmes', 'The Adventures of Sherlock Holmes', 'Arthur Conan Doyle', ['mystery', 'detective']),
  fallbackSE('herman-melville/moby-dick', 'Moby Dick; Or, The Whale', 'Herman Melville', ['adventure', 'classic']),
  fallbackSE('charlotte-bronte/jane-eyre', 'Jane Eyre', 'Charlotte Brontë', ['romance', 'gothic', 'classic']),
  fallbackSE('emily-bronte/wuthering-heights', 'Wuthering Heights', 'Emily Brontë', ['romance', 'gothic', 'classic']),
  fallbackSE('mark-twain/the-adventures-of-tom-sawyer', 'The Adventures of Tom Sawyer', 'Mark Twain', ['adventure', 'classic']),
  fallbackSE('charles-dickens/a-tale-of-two-cities', 'A Tale of Two Cities', 'Charles Dickens', ['historical fiction', 'classic']),
  fallbackSE('h-g-wells/the-time-machine', 'The Time Machine', 'H. G. Wells', ['science fiction', 'classic']),
  fallbackSE('h-g-wells/the-war-of-the-worlds', 'The War of the Worlds', 'H. G. Wells', ['science fiction', 'classic']),
  fallbackSE('robert-louis-stevenson/treasure-island', 'Treasure Island', 'Robert Louis Stevenson', ['adventure', 'classic']),
  fallbackSE('jane-austen/sense-and-sensibility', 'Sense and Sensibility', 'Jane Austen', ['romance', 'classic']),
  fallbackSE('leo-tolstoy/annette-karenina', 'Anna Karenina', 'Leo Tolstoy', ['romance', 'classic']),
  fallbackSE('f-scott-fitzgerald/the-great-gatsby', 'The Great Gatsby', 'F. Scott Fitzgerald', ['classic', 'literary fiction']),
  fallbackSE('oscar-wilde/the-picture-of-dorian-gray', 'The Picture of Dorian Gray', 'Oscar Wilde', ['classic', 'gothic fiction']),
];

// ---------------------------------------------------------------------------
// HTML catalog scraping — parses standardebooks.org/ebooks?query=X
// ---------------------------------------------------------------------------

function parseSearchPageHtml(html: string): MappedStandardEbooksBook[] {
  const $ = cheerio.load(html);
  const books: MappedStandardEbooksBook[] = [];

  // Each book entry in the SE catalog grid
  $('section.book-list li, div.book-list li, ol li, ul li').each((_, el) => {
    const $el = $(el);
    const linkEl = $el.find('a[href*="/ebooks/"]').first();
    const href = linkEl.attr('href');
    if (!href) return;

    // Extract the slug from the href (e.g. /ebooks/herman-melville/moby-dick)
    const slugMatch = href.match(/\/ebooks\/(.+)$/);
    if (!slugMatch) return;
    const id = slugMatch[1].replace(/\/$/, '');

    const title = $el.find('h2, h3, h4, .title, [property="name"]').first().text().trim()
      || linkEl.text().trim();
    if (!title) return;

    const author = $el.find('.author, [property="author"], p').first().text().trim()
      || 'Unknown author';

    // Look for cover image
    const imgEl = $el.find('img[src*="cover"], img[alt*="cover"], img').first();
    const coverSrc = imgEl.attr('src') || imgEl.attr('data-src') || '';
    const cover = coverSrc
      ? (coverSrc.startsWith('http') ? coverSrc : `https://standardebooks.org${coverSrc}`)
      : `https://standardebooks.org/ebooks/${id}/downloads/cover-thumbnail.jpg`;

    books.push({
      id,
      title,
      authors: author,
      formats: {
        epub: `https://standardebooks.org/ebooks/${id}/downloads/${id.split('/').pop()}.epub`,
        text: `https://standardebooks.org/ebooks/${id}/text/single-page`,
        web: `https://standardebooks.org/ebooks/${id}`,
        cover,
      },
      source: 'standardebooks',
      subjects: [],
    });
  });

  // Fallback: if no structured list found, try parsing any book links on the page
  if (books.length === 0) {
    $('a[href*="/ebooks/"]').each((_, el) => {
      const $a = $(el);
      const href = $a.attr('href') || '';
      const slugMatch = href.match(/\/ebooks\/([a-z].+)$/);
      if (!slugMatch) return;
      const id = slugMatch[1].replace(/\/$/, '');
      // Skip navigation/category links (single-segment slugs are author pages)
      if (!id.includes('/')) return;

      const title = $a.text().trim();
      if (!title || title.length < 2 || title.length > 200) return;

      books.push({
        id,
        title,
        authors: 'Standard Ebooks',
        formats: {
          epub: `https://standardebooks.org/ebooks/${id}/downloads/${id.split('/').pop()}.epub`,
          text: `https://standardebooks.org/ebooks/${id}/text/single-page`,
          web: `https://standardebooks.org/ebooks/${id}`,
          cover: `https://standardebooks.org/ebooks/${id}/downloads/cover-thumbnail.jpg`,
        },
        source: 'standardebooks',
        subjects: [],
      });
    });
  }

  return dedupeSEBooks(books);
}

// ---------------------------------------------------------------------------
// Atom feed parser — parses the public /feeds/atom/new-releases feed
// ---------------------------------------------------------------------------

function parseAtomFeed(xml: string): MappedStandardEbooksBook[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const books: MappedStandardEbooksBook[] = [];

  $('entry').each((_, entry) => {
    const $entry = $(entry);
    const id = $entry.children('id').first().text().trim();
    // SE atom IDs look like: https://standardebooks.org/ebooks/author-slug/title-slug
    const slugMatch = id.match(/\/ebooks\/(.+)$/);
    if (!slugMatch) return;

    const bookId = slugMatch[1].replace(/\/$/, '');
    const title = $entry.children('title').first().text().trim();
    if (!title) return;

    // Authors
    const authorNames: string[] = [];
    $entry.children('author').each((_, authorEl) => {
      const name = $(authorEl).children('name').first().text().trim();
      if (name) authorNames.push(name);
    });

    // Links
    let epubUrl = '';
    let textUrl = '';
    let webUrl = '';
    let coverUrl = '';

    $entry.children('link').each((_, linkEl) => {
      const href = $(linkEl).attr('href') || '';
      const rel = $(linkEl).attr('rel') || '';
      const type = $(linkEl).attr('type') || '';
      const title = $(linkEl).attr('title') || '';

      if (rel === 'enclosure' && type === 'application/epub+zip' && title.toLowerCase().includes('compatible')) {
        epubUrl = href;
      } else if (rel === 'alternate' && type === 'application/xhtml+xml') {
        webUrl = href;
      } else if (rel === 'enclosure' && type === 'application/xhtml+xml') {
        textUrl = href;
      }
    });

    // Cover thumbnail via media:thumbnail
    const thumbnailEl = $entry.find('thumbnail, media\\:thumbnail').first();
    coverUrl = thumbnailEl.attr('url') || '';

    // Subjects
    const subjects: string[] = [];
    $entry.children('category[term]').each((_, catEl) => {
      const term = $(catEl).attr('term') || '';
      if (term) subjects.push(term);
    });

    const fallbackTitle = title.split('/').pop() || title;

    books.push({
      id: bookId,
      title,
      authors: authorNames.join(', ') || 'Standard Ebooks',
      formats: {
        epub: epubUrl || `https://standardebooks.org/ebooks/${bookId}/downloads/${fallbackTitle}.epub`,
        text: textUrl || `https://standardebooks.org/ebooks/${bookId}/text/single-page`,
        web: webUrl || `https://standardebooks.org/ebooks/${bookId}`,
        cover: coverUrl || `https://standardebooks.org/ebooks/${bookId}/downloads/cover-thumbnail.jpg`,
      },
      source: 'standardebooks',
      subjects,
    });
  });

  return dedupeSEBooks(books);
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function dedupeSEBooks(books: MappedStandardEbooksBook[]): MappedStandardEbooksBook[] {
  const seen = new Set<string>();
  return books.filter((book) => {
    if (seen.has(book.id)) return false;
    seen.add(book.id);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scrape the public Standard Ebooks catalog page for a search query.
 * Returns mapped books or empty array on failure.
 */
export async function fetchStandardEbooksSearch(
  query: string,
): Promise<MappedStandardEbooksBook[]> {
  const params = new URLSearchParams({ query, 'per-page': '20', page: '1' });
  const url = `https://standardebooks.org/ebooks?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'text/html',
        'User-Agent': 'PAGE.OS/1.0 (open-knowledge-reader)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`[StandardEbooks] Search failed: ${res.status}`);
      return [];
    }

    const html = await res.text();
    return parseSearchPageHtml(html);
  } catch (error) {
    console.error('[StandardEbooks] Search error:', error);
    return [];
  }
}

/**
 * Fetch the public new-releases Atom feed (15 most recent books).
 */
export async function fetchStandardEbooksNewReleases(): Promise<MappedStandardEbooksBook[]> {
  try {
    const res = await fetch('https://standardebooks.org/feeds/atom/new-releases', {
      headers: {
        Accept: 'application/atom+xml, application/xml, text/xml',
        'User-Agent': 'PAGE.OS/1.0 (open-knowledge-reader)',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error(`[StandardEbooks] Atom feed failed: ${res.status}`);
      return [];
    }

    const xml = await res.text();
    return parseAtomFeed(xml);
  } catch (error) {
    console.error('[StandardEbooks] Atom feed error:', error);
    return [];
  }
}

/**
 * Return the curated fallback list for offline/error states.
 */
export function getStandardEbooksFallbackBooks(): MappedStandardEbooksBook[] {
  return FALLBACK_STANDARD_EBOOKS;
}
