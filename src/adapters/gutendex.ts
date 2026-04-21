

type GutenbergBook = {
  id: number;
  title: string;
  authors: { name: string }[];
  formats: Record<string, string>;
  subjects?: string[];
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
  subjects?: string[];
};

const fallbackBook = (
  id: string,
  title: string,
  authors: string,
  subjects: string[] = [],
): MappedGutenbergBook => ({
  id,
  title,
  authors,
  formats: { 'text/plain; charset=utf-8': `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt` },
  source: 'gutendex',
  subjects,
});

export const FALLBACK_GUTENBERG_BOOKS: MappedGutenbergBook[] = [
  fallbackBook('84', 'Frankenstein; Or, The Modern Prometheus', 'Mary Wollstonecraft Shelley', ['horror', 'science fiction', 'gothic']),
  fallbackBook('1342', 'Pride and Prejudice', 'Jane Austen', ['romance', 'classic', 'society']),
  fallbackBook('11', "Alice's Adventures in Wonderland", 'Lewis Carroll', ['fantasy', 'adventure', 'classic']),
  fallbackBook('1661', 'The Adventures of Sherlock Holmes', 'Arthur Conan Doyle', ['mystery', 'detective', 'crime']),
  fallbackBook('2701', 'Moby Dick; Or, The Whale', 'Herman Melville', ['adventure', 'classic', 'sea stories']),
  fallbackBook('98', 'A Tale of Two Cities', 'Charles Dickens', ['historical fiction', 'classic']),
  fallbackBook('74', 'The Adventures of Tom Sawyer, Complete', 'Mark Twain', ['adventure', 'classic']),
  fallbackBook('64317', 'The Great Gatsby', 'F. Scott Fitzgerald', ['classic', 'literary fiction']),
  fallbackBook('35', 'The Time Machine', 'H. G. Wells', ['science fiction', 'time travel']),
  fallbackBook('36', 'The War of the Worlds', 'H. G. Wells', ['science fiction', 'alien invasion']),
  fallbackBook('159', 'The Island of Doctor Moreau', 'H. G. Wells', ['science fiction', 'horror']),
  fallbackBook('201', 'Flatland: A Romance of Many Dimensions', 'Edwin A. Abbott', ['science fiction', 'mathematics']),
  fallbackBook('5230', 'The Invisible Man: A Grotesque Romance', 'H. G. Wells', ['science fiction']),
  fallbackBook('2852', 'The Hound of the Baskervilles', 'Arthur Conan Doyle', ['mystery', 'detective']),
  fallbackBook('155', 'The Moonstone', 'Wilkie Collins', ['mystery', 'detective']),
  fallbackBook('583', 'The Woman in White', 'Wilkie Collins', ['mystery', 'sensation fiction']),
  fallbackBook('204', 'The Innocence of Father Brown', 'G. K. Chesterton', ['mystery', 'detective']),
  fallbackBook('1155', 'The Secret Adversary', 'Agatha Christie', ['mystery', 'thriller']),
  fallbackBook('1260', 'Jane Eyre: An Autobiography', 'Charlotte Bronte', ['romance', 'gothic', 'classic']),
  fallbackBook('768', 'Wuthering Heights', 'Emily Bronte', ['romance', 'gothic', 'classic']),
  fallbackBook('161', 'Sense and Sensibility', 'Jane Austen', ['romance', 'classic']),
  fallbackBook('105', 'Persuasion', 'Jane Austen', ['romance', 'classic']),
  fallbackBook('121', 'Northanger Abbey', 'Jane Austen', ['romance', 'gothic satire']),
  fallbackBook('120', 'Treasure Island', 'Robert Louis Stevenson', ['adventure', 'pirates']),
  fallbackBook('76', 'Adventures of Huckleberry Finn', 'Mark Twain', ['adventure', 'classic']),
  fallbackBook('103', 'Around the World in Eighty Days', 'Jules Verne', ['adventure', 'travel']),
  fallbackBook('521', 'The Life and Adventures of Robinson Crusoe', 'Daniel Defoe', ['adventure']),
  fallbackBook('215', 'The Call of the Wild', 'Jack London', ['adventure', 'animals']),
];

export function getFallbackGutenbergBooks(query?: string): MappedGutenbergBook[] {
  if (!query?.trim()) {
    return FALLBACK_GUTENBERG_BOOKS;
  }

  const normalizedQuery = query.trim().toLowerCase();
  return FALLBACK_GUTENBERG_BOOKS.filter((book) => {
    const haystack = `${book.title} ${book.authors} ${book.subjects?.join(' ') ?? ''}`.toLowerCase();
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
    source: 'gutendex' as const,
    subjects: book.subjects ?? [],
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
