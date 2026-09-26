'use client';

import { useEffect, useState } from 'react';
import type { SearchResult } from '@/adapters/sourceManager';

export type BookDetails = {
  id: string;
  title: string;
  authors: string;
  summaries: string[];
  subjects: string[];
  bookshelves: string[];
  copyright: boolean | null;
  downloadCount: number;
  languages: string[];
  birthYear: number | null;
  deathYear: number | null;
};

const cache = new Map<string, BookDetails>();

type GutendexBook = {
  id: number;
  title: string;
  authors: { name: string; birth_year: number | null; death_year: number | null }[];
  summaries: string[];
  subjects: string[];
  bookshelves: string[];
  copyright: boolean | null;
  download_count: number;
  languages: string[];
};

export type BookDetailsResult = {
  details: BookDetails | null;
  isLoading: boolean;
};

function stubFromBook(book: SearchResult): BookDetails {
  return {
    id: book.id,
    title: book.title,
    authors: book.authors,
    summaries: [],
    subjects: [],
    bookshelves: [],
    copyright: null,
    downloadCount: 0,
    languages: [],
    birthYear: null,
    deathYear: null,
  };
}

/**
 * Fetches rich book details (summary, subjects, shelves, author lifespan)
 * from the Gutendex single-book endpoint, with an in-memory cache.
 * Non-Gutendex books resolve to a stub built from their search metadata.
 */
export function useBookDetails(book: SearchResult | null): BookDetailsResult {
  const [result, setResult] = useState<BookDetailsResult>({ details: null, isLoading: false });

  useEffect(() => {
    if (!book) {
      setResult({ details: null, isLoading: false });
      return;
    }

    if (book.source !== 'gutendex') {
      setResult({ details: stubFromBook(book), isLoading: false });
      return;
    }

    const cached = cache.get(book.id);
    if (cached) {
      setResult({ details: cached, isLoading: false });
      return;
    }

    let cancelled = false;
    setResult({ details: null, isLoading: true });

    const load = async () => {
      try {
        const res = await fetch(`/api/book-details?id=${encodeURIComponent(book.id)}`);
        if (!res.ok) throw new Error('lookup failed');
        const data = (await res.json()) as GutendexBook;

        const author = data.authors?.[0];
        const mapped: BookDetails = {
          id: String(data.id),
          title: data.title,
          authors: data.authors?.map((a) => a.name).join(', ') || book.authors,
          summaries: data.summaries ?? [],
          subjects: data.subjects ?? [],
          bookshelves: data.bookshelves ?? [],
          copyright: data.copyright ?? null,
          downloadCount: data.download_count ?? 0,
          languages: data.languages ?? [],
          birthYear: author?.birth_year ?? null,
          deathYear: author?.death_year ?? null,
        };

        if (!cancelled) {
          cache.set(book.id, mapped);
          setResult({ details: mapped, isLoading: false });
        }
      } catch {
        // silent — fall back to the basic search metadata
        if (!cancelled && book) {
          setResult({ details: stubFromBook(book), isLoading: false });
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [book]);

  return result;
}

export default useBookDetails;
