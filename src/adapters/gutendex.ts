

type GutenbergBook = {
  id: number;
  title: string;
  authors: { name: string }[];
  formats: Record<string, string>;
};

type GutenbergAPIResponse = {
  results: GutenbergBook[];
};

export type MappedGutenbergBook = {
  id: string;
  title: string;
  authors: string;
  formats: Record<string, string>;
  source: 'gutendex';
};

export const FALLBACK_GUTENBERG_BOOKS: MappedGutenbergBook[] = [
  {
    id: '84',
    title: 'Frankenstein; Or, The Modern Prometheus',
    authors: 'Mary Wollstonecraft Shelley',
    formats: { 'text/plain; charset=utf-8': 'https://www.gutenberg.org/files/84/84-0.txt' },
    source: 'gutendex',
  },
  {
    id: '1342',
    title: 'Pride and Prejudice',
    authors: 'Jane Austen',
    formats: { 'text/plain; charset=utf-8': 'https://www.gutenberg.org/files/1342/1342-0.txt' },
    source: 'gutendex',
  },
  {
    id: '11',
    title: "Alice's Adventures in Wonderland",
    authors: 'Lewis Carroll',
    formats: { 'text/plain; charset=utf-8': 'https://www.gutenberg.org/files/11/11-0.txt' },
    source: 'gutendex',
  },
  {
    id: '1661',
    title: 'The Adventures of Sherlock Holmes',
    authors: 'Arthur Conan Doyle',
    formats: { 'text/plain; charset=utf-8': 'https://www.gutenberg.org/files/1661/1661-0.txt' },
    source: 'gutendex',
  },
  {
    id: '2701',
    title: 'Moby Dick; Or, The Whale',
    authors: 'Herman Melville',
    formats: { 'text/plain; charset=utf-8': 'https://www.gutenberg.org/files/2701/2701-0.txt' },
    source: 'gutendex',
  },
  {
    id: '98',
    title: 'A Tale of Two Cities',
    authors: 'Charles Dickens',
    formats: { 'text/plain; charset=utf-8': 'https://www.gutenberg.org/files/98/98-0.txt' },
    source: 'gutendex',
  },
  {
    id: '74',
    title: 'The Adventures of Tom Sawyer, Complete',
    authors: 'Mark Twain',
    formats: { 'text/plain; charset=utf-8': 'https://www.gutenberg.org/files/74/74-0.txt' },
    source: 'gutendex',
  },
  {
    id: '64317',
    title: 'The Great Gatsby',
    authors: 'F. Scott Fitzgerald',
    formats: { 'text/plain; charset=utf-8': 'https://www.gutenberg.org/files/64317/64317-0.txt' },
    source: 'gutendex',
  },
];

export function getFallbackGutenbergBooks(query?: string): MappedGutenbergBook[] {
  if (!query?.trim()) {
    return FALLBACK_GUTENBERG_BOOKS;
  }

  const normalizedQuery = query.trim().toLowerCase();
  return FALLBACK_GUTENBERG_BOOKS.filter((book) => {
    const haystack = `${book.title} ${book.authors}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

/**
 * This file is the specific adapter for the Gutendex API (gutenberg.org).
 * It handles fetching lists of books and the content of a single book.
 */

export async function fetchGutenbergBooks(query?: string, page = 1): Promise<MappedGutenbergBook[]> {
  const params = new URLSearchParams();
  if (query) {
    params.set('query', query);
  }
  params.set('page', String(page));

  const res = await fetch(`/api/gutendex?${params.toString()}`);
  if (!res.ok) {
    console.error('Failed to fetch from Gutendex:', res.statusText);
    return getFallbackGutenbergBooks(query);
  }
  const data: GutenbergAPIResponse = await res.json();
  // We map the raw API response to our standardized `MappedGutenbergBook` format.
  // This ensures that data from all sources has a consistent shape within our app.
  const mapped: MappedGutenbergBook[] = data.results.map(book => ({
    id: String(book.id),
    title: book.title,
    authors: book.authors.map(a => a.name).join(', '),
    formats: book.formats,
    source: 'gutendex' as const
  }));
  return mapped.length > 0 ? mapped : getFallbackGutenbergBooks(query);
}

/**
 * Fetches the actual text content of a single book from Gutendex.
 * @param formats A record of available formats for the book (e.g., 'text/plain', 'application/epub+zip').
 * @returns A promise that resolves to the book's content as a single string.
 */
export async function fetchGutenbergBookContent(formats: Record<string, string>): Promise<string | Blob> {
  const formatEntries = Object.entries(formats);

  // STEP 1: Find a suitable plain text format.
  // We prioritize plain text because it's the easiest to parse and display.
  // We specifically exclude .zip files, as they would require an extra decompression step.
  const plainTextEntry = formatEntries.find(([key, url]) => 
    key.startsWith('text/plain') && !url.endsWith('.zip')
  );

  if (plainTextEntry) {
    // STEP 2: If a plain text URL is found, fetch its content.
    const plainTextUrl = plainTextEntry[1];
    // Again, we use our API proxy for the fetch.
    const res = await fetch(`/api/proxy?url=${encodeURIComponent(plainTextUrl)}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch book content from ${plainTextUrl}`);
    }
    // STEP 3: Return the content as a raw text string.
    return await res.text();
  }

  // If we find an EPUB, throw a specific error because the reader doesn't support it.
  const epubUrl = formats['application/epub+zip'];
  if (epubUrl) {
    throw new Error('EPUB format is not supported by the PageOS reader at this time.');
  }

  // If no compatible format is found, throw a general error.
  throw new Error('No compatible book format found for this Gutendex book (epub or txt).');
}
