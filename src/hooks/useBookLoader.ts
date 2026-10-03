'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import type { SearchResult } from '@/adapters/sourceManager';
import { fetchBookContent } from '@/adapters/sourceManager';
import { fetchWebBookContent } from '@/adapters/web';
import { getLibraryBook, generateBookId } from '@/services/userData';
import { useAuth } from '@/context/auth-provider';

export type TOCEntry = {
  title: string;
  sectorIndex: number;
  chapterIndex: number;
  pageCount: number;
};

export type ReaderSector = {
  title: string;
  chapterTitle: string;
  chapterIndex: number;
  paragraphs: string[];
  pageNumberInChapter: number;
  pageCountInChapter: number;
  startParagraphIndex: number;
};

export type ReaderMediaType = 'text' | 'pdf';

type ChapterBlock = {
  title: string;
  paragraphs: string[];
};

const CHAPTER_HEADING =
  /^(chapter|book|part|section|letter|prologue|epilogue|preface|introduction|act|scene)\b[\s.:,-]*(.*)$/i;

const ROMAN_HEADING =
  /^(chapter|book|part|section)?\s*[ivxlcdm]{1,12}[\s.:,-]*([a-z0-9'"\- ,;:!?()]*)$/i;

function stripGutenbergBoilerplate(rawText: string) {
  const text = rawText.replace(/\r\n/g, '\n').replace(/\uFEFF/g, '');

  const startMatch = text.match(/\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i);
  const endMatch = text.match(/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i);

  let trimmed = text;
  if (startMatch) {
    trimmed = trimmed.slice(startMatch.index! + startMatch[0].length);
  }
  if (endMatch) {
    trimmed = trimmed.slice(0, endMatch.index);
  }

  return trimmed.trim();
}

function normalizeParagraphs(text: string) {
  return stripGutenbergBoilerplate(text)
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function looksLikeHeading(paragraph: string) {
  const clean = paragraph.trim();

  if (clean.length < 3 || clean.length > 110) {
    return false;
  }

  if (CHAPTER_HEADING.test(clean)) {
    return true;
  }

  if (/^[A-Z][A-Z0-9\s,'".:;!?-]{4,90}$/.test(clean)) {
    return true;
  }

  if (ROMAN_HEADING.test(clean) && clean.split(' ').length <= 10) {
    return true;
  }

  return false;
}

function buildChapters(paragraphs: string[]) {
  const chapters: ChapterBlock[] = [];
  let current: ChapterBlock = {
    title: 'Opening',
    paragraphs: [],
  };

  paragraphs.forEach((paragraph, index) => {
    const isHeading =
      looksLikeHeading(paragraph) &&
      index > 0 &&
      paragraphs[index + 1] &&
      paragraphs[index + 1].length > 40;

    if (isHeading) {
      if (current.paragraphs.length > 0) {
        chapters.push(current);
      }

      current = {
        title: paragraph,
        paragraphs: [],
      };
      return;
    }

    current.paragraphs.push(paragraph);
  });

  if (current.paragraphs.length > 0) {
    chapters.push(current);
  }

  if (chapters.length <= 1 && paragraphs.length > 18) {
    const fallbackChapters: ChapterBlock[] = [];
    const chunkSize = 18;

    for (let i = 0; i < paragraphs.length; i += chunkSize) {
      fallbackChapters.push({
        title: `Section ${Math.floor(i / chunkSize) + 1}`,
        paragraphs: paragraphs.slice(i, i + chunkSize),
      });
    }

    return fallbackChapters;
  }

  return chapters;
}

function paginateChapters(chapters: ChapterBlock[]) {
  const sectors: ReaderSector[] = [];
  const toc: TOCEntry[] = [];
  let globalParagraphIndex = 0;

  chapters.forEach((chapter, chapterIndex) => {
    const chapterSectors: ReaderSector[] = [];
    let currentPage: string[] = [];
    let currentChars = 0;
    const maxChars = 1500;
    const minChars = 700;

    chapter.paragraphs.forEach((paragraph) => {
      const paragraphLength = paragraph.length;
      const shouldBreak =
        currentPage.length >= 2 &&
        currentChars >= minChars &&
        currentChars + paragraphLength > maxChars;

      if (shouldBreak) {
        chapterSectors.push({
          title: `${chapter.title} / Page ${chapterSectors.length + 1}`,
          chapterTitle: chapter.title,
          chapterIndex,
          paragraphs: currentPage,
          pageNumberInChapter: chapterSectors.length + 1,
          pageCountInChapter: 0,
          startParagraphIndex: globalParagraphIndex - currentPage.length,
        });
        currentPage = [];
        currentChars = 0;
      }

      currentPage.push(paragraph);
      currentChars += paragraphLength;
      globalParagraphIndex += 1;
    });

    if (currentPage.length > 0) {
      chapterSectors.push({
        title: `${chapter.title} / Page ${chapterSectors.length + 1}`,
        chapterTitle: chapter.title,
        chapterIndex,
        paragraphs: currentPage,
        pageNumberInChapter: chapterSectors.length + 1,
        pageCountInChapter: 0,
        startParagraphIndex: globalParagraphIndex - currentPage.length,
      });
    }

    const pageCountInChapter = Math.max(chapterSectors.length, 1);
    chapterSectors.forEach((sector) => {
      sectors.push({
        ...sector,
        pageCountInChapter,
      });
    });

    toc.push({
      title: chapter.title,
      sectorIndex: sectors.length - chapterSectors.length,
      chapterIndex,
      pageCount: pageCountInChapter,
    });
  });

  return { sectors, toc };
}

export default function useBookLoader(searchParams: URLSearchParams, enabled = true) {
  const { user } = useAuth();
  const [book, setBook] = useState<SearchResult | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<ReaderMediaType>('text');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSector, setActiveSector] = useState(0);
  const [direction, setDirection] = useState(0);
  const lastFetchedIdRef = useRef<string | null>(null);

  useEffect(() => {
    const loadBookData = async () => {
      setError(null);

      const source = searchParams.get('source');
      const id = searchParams.get('id');
      const title = searchParams.get('title');
      const webUrl = searchParams.get('url');
      const requestedFormat = searchParams.get('format');
      const resolvedId = id || (source === 'web' ? webUrl : null);

      if (!source || !resolvedId || !title) {
        setError('Essential book information is missing from the request.');
        setIsLoading(false);
        return;
      }

      try {
        let parsedBook: SearchResult;
        let resolvedMedia: ReaderMediaType = 'text';

        if (source === 'web') {
          // If the url param isn't strictly provided, we try pulling it from the formats payload 
          // (which happens when launching web archive books from the library).
          const providedFormats = searchParams.get('formats') 
            ? JSON.parse(searchParams.get('formats')!) as Record<string, string> 
            : {};
          
          const url = webUrl || providedFormats.web || providedFormats.pdf;
          if (!url) {
            throw new Error('This archive record does not contain a readable file URL.');
          }
          const isPdf = requestedFormat === 'pdf' || !!providedFormats.pdf || /\.(?:pdf|lcpdf|kpdf)(?:$|[?#])/i.test(url);
          const media: ReaderMediaType = isPdf ? 'pdf' : 'text';
          setMediaType(media);
          resolvedMedia = media;
          parsedBook = {
            id: resolvedId,
            title,
            source: 'web',
            authors: searchParams.get('authors') || 'Open archive',
            formats: isPdf ? { pdf: url, web: url } : { web: url },
          };
        } else {
          const providedFormats = JSON.parse(searchParams.get('formats') || '{}') as Record<string, string>;
          const formats = Object.keys(providedFormats).length > 0
            ? providedFormats
            : {
                'text/plain; charset=utf-8': `https://www.gutenberg.org/cache/epub/${resolvedId}/pg${resolvedId}.txt`,
              };
          parsedBook = {
            id: resolvedId,
            title,
            source: source as 'gutendex',
            authors: searchParams.get('authors') || 'Unknown',
            formats,
          };
          setMediaType('text');
        }

        setBook(parsedBook);

        // Briefing stage: book metadata is ready, but defer the content
        // fetch until the user chooses to start reading.
        if (!enabled) {
          // Re-opening the briefing for the same book keeps its content.
          if (lastFetchedIdRef.current !== parsedBook.id) {
            setContent(null);
          }
          setIsLoading(false);
          return;
        }

        // Content already fetched for this book — nothing to do.
        if (lastFetchedIdRef.current === parsedBook.id) {
          setIsLoading(false);
          return;
        }

        setIsLoading(true);

        let loadedContent: string | Blob | null = null;
        if (parsedBook.source === 'web') {
          if (resolvedMedia === 'pdf') {
            loadedContent = null;
          } else {
            const webUrl2 = parsedBook.formats?.web;
            if (!webUrl2) {
              throw new Error('This archive record does not contain a readable file URL.');
            }
            loadedContent = await fetchWebBookContent(webUrl2);
            if (!loadedContent) {
              throw new Error('Could not extract readable text from the web page.');
            }
          }
        } else {
          loadedContent = await fetchBookContent(parsedBook);
        }

        setContent(typeof loadedContent === 'string' ? loadedContent : null);
        lastFetchedIdRef.current = parsedBook.id;

        if (user && parsedBook) {
          const bookId = generateBookId(parsedBook);
          const libraryBook = await getLibraryBook(user.uid, bookId);
          if (libraryBook && typeof libraryBook.lastReadSector === 'number') {
            setActiveSector(libraryBook.lastReadSector);
          } else {
            setActiveSector(0);
          }
        } else {
          setActiveSector(0);
        }
      } catch (e) {
        const errorMessage =
          e instanceof Error
            ? e.message
            : 'An unknown error occurred while loading the book.';
        setError(errorMessage);
        console.error('Book loading error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadBookData();
  }, [searchParams, user, enabled]);

  const { sectors, toc } = useMemo(() => {
    if (!content) {
      return { sectors: [] as ReaderSector[], toc: [] as TOCEntry[] };
    }

    const paragraphs = normalizeParagraphs(content);
    const chapters = buildChapters(paragraphs);
    return paginateChapters(chapters);
  }, [content]);

  const safeActiveSector =
    mediaType === 'pdf' ? activeSector : sectors.length === 0 ? 0 : Math.min(activeSector, sectors.length - 1);
  const currentSector = sectors[safeActiveSector];
  const currentChapter =
    currentSector ? toc[currentSector.chapterIndex] : undefined;

  return {
    book,
    isLoading,
    error,
    toc,
    sectors,
    currentSector,
    currentChapter,
    mediaType,
    activeSector: safeActiveSector,
    setActiveSector,
    direction,
    setDirection,
  };
}
