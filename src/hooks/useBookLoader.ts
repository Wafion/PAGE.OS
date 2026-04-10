'use client';

import { useEffect, useMemo, useState } from 'react';
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

export default function useBookLoader(searchParams: URLSearchParams) {
  const { user } = useAuth();
  const [book, setBook] = useState<SearchResult | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSector, setActiveSector] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const loadBookData = async () => {
      setIsLoading(true);
      setError(null);

      const source = searchParams.get('source');
      const id = searchParams.get('id');
      const title = searchParams.get('title');

      if (!source || !id || !title) {
        setError('Essential book information is missing from the request.');
        setIsLoading(false);
        return;
      }

      try {
        let loadedContent: string | Blob | null = null;
        let parsedBook: SearchResult;

        if (source === 'web') {
          const url = searchParams.get('url')!;
          parsedBook = {
            id: url,
            title: searchParams.get('title')!,
            source: 'web' as 'gutendex',
            authors: 'Web Source',
            formats: {},
          };
          loadedContent = await fetchWebBookContent(url);
          if (!loadedContent) {
            throw new Error('Could not extract readable text from the web page.');
          }
        } else {
          parsedBook = {
            id,
            title,
            source: source as 'gutendex',
            authors: searchParams.get('authors') || 'Unknown',
            formats: JSON.parse(searchParams.get('formats') || '{}'),
          };
          loadedContent = await fetchBookContent(parsedBook);
        }

        setBook(parsedBook);
        setContent(typeof loadedContent === 'string' ? loadedContent : null);

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
  }, [searchParams, user]);

  const { sectors, toc } = useMemo(() => {
    if (!content) {
      return { sectors: [] as ReaderSector[], toc: [] as TOCEntry[] };
    }

    const paragraphs = normalizeParagraphs(content);
    const chapters = buildChapters(paragraphs);
    return paginateChapters(chapters);
  }, [content]);

  const safeActiveSector =
    sectors.length === 0 ? 0 : Math.min(activeSector, sectors.length - 1);
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
    activeSector: safeActiveSector,
    setActiveSector,
    direction,
    setDirection,
  };
}
