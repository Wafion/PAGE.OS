

import * as gutendex from './gutendex';
import type { MappedGutenbergBook } from './gutendex';

export type SourceKey = 'gutendex' | 'web';

export type SearchResult =
  | MappedGutenbergBook
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
 * Currently, it only supports Gutendex, but it's designed to be easily extendable.
 * For example, if you were to add another internal source like 'Standard Ebooks',
 * you would add a case for it in the fetchBookContent function.
 */


/**
 * Fetches content from a primary source (currently only Gutendex).
 * This function determines which adapter to use based on the book's `source` property.
 * @param book The book object from a search result.
 * @returns A promise that resolves to the string content of the book.
 */
export async function fetchBookContent(book: SearchResult): Promise<string | Blob> {
  // A switch statement would be used here if we had multiple primary sources.
  // switch (book.source) {
  //   case 'gutendex':
  //     return await gutendex.fetchGutenbergBookContent(book.formats);
  //   case 'anotherSource':
  //     // return await anotherSource.fetchContent(book.details);
  //   default:
  //     throw new Error(`Unknown book source: ${book.source}`);
  // }
  
  // Since we only have Gutendex as a primary source, we call its adapter directly.
  if (book.source === 'gutendex' && book.formats && typeof book.formats === 'object' && !('web' in book.formats)) {
    return await gutendex.fetchGutenbergBookContent(book.formats as Record<string, string>);
  }
  throw new Error('Unsupported or missing formats for this book source.');
}
