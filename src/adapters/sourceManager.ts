

import * as gutendex from './gutendex';
import type { MappedGutenbergBook } from './gutendex';
import type { MappedStandardEbooksBook } from './standard-ebooks';

export type SourceKey = 'gutendex' | 'web' | 'standardebooks';

export type SearchResult =
  | MappedGutenbergBook
  | MappedStandardEbooksBook
  | {
      source: 'web';
      id: string;
      title: string;
      authors: string;
      formats?: {
        web: string; // or any URL string
      };
    };

/**
 * This file acts as a central hub for fetching book content from various sources.
 * Supports Gutendex (TXT/EPUB), Standard Ebooks (EPUB), and web sources (TXT/PDF/HTML).
 */


/**
 * Returns the EPUB URL for a book if one is available.
 * Used by useBookLoader to determine if epub.js rendering is needed.
 */
export function getEpubUrl(book: SearchResult): string | null {
  if (book.source === 'standardebooks' && book.formats && 'epub' in book.formats) {
    const epubUrl = (book.formats as { epub?: string }).epub;
    return epubUrl || null;
  }
  if (book.source === 'gutendex' && book.formats && typeof book.formats === 'object') {
    const epubUrl = (book.formats as Record<string, string>)['application/epub+zip'];
    return epubUrl || null;
  }
  return null;
}

/**
 * Fetches text content from a primary source.
 * For EPUB-only books (Standard Ebooks), this fetches the "read online" text page.
 * For Gutendex books, this fetches the plain text file.
 */
export async function fetchBookContent(book: SearchResult): Promise<string | Blob> {
  // Standard Ebooks: fetch the "read online" single-page text
  if (book.source === 'standardebooks' && book.formats && 'text' in book.formats) {
    const textUrl = (book.formats as { text?: string }).text;
    if (textUrl) {
      try {
        const res = await fetch(`/api/proxy?url=${encodeURIComponent(textUrl)}`,
          { signal: AbortSignal.timeout(20000) }
        );
        if (res.ok) {
          const html = await res.text();
          // Strip HTML tags to get plain text
          const text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, '\n')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
          if (text.length > 200) return text;
        }
      } catch (error) {
        console.warn('[StandardEbooks] Text fetch failed:', error);
      }
    }
    throw new Error('Could not load book text from Standard Ebooks.');
  }

  // Gutendex: fetch plain text
  if (book.source === 'gutendex' && book.formats && typeof book.formats === 'object' && !('web' in book.formats)) {
    return await gutendex.fetchGutenbergBookContent(book.formats as Record<string, string>);
  }

  throw new Error('Unsupported or missing formats for this book source.');
}
