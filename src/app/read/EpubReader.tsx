'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import ePub, { Book, Rendition } from 'epubjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Bookmark,
  LoaderCircle,
  AlertTriangle,
  List,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useReaderSettings } from '@/context/reader-settings-provider';
import { useAudio } from '@/context/audio-provider';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { AudioControls } from '@/components/audio/audio-controls';
import type { SearchResult } from '@/adapters/sourceManager';
import TOCModal from './TOCModal';
import type { TOCEntry } from '@/hooks/useBookLoader';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EpubReaderProps = {
  book: SearchResult;
  url: string;               // proxied EPUB URL or direct URL
  activeSector: number;
  onSectorChange: (index: number) => void;
  onBack: () => void;
  isBookmarked: boolean;
  isBookmarkLoading: boolean;
  onToggleBookmark: () => void;
  hasUser: boolean;
  userId?: string;
};

type EpubTocItem = {
  id: string;
  label: string;
  href: string;
  subitems?: EpubTocItem[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function flattenToc(items: EpubTocItem[]): EpubTocItem[] {
  const flat: EpubTocItem[] = [];
  items.forEach((item) => {
    flat.push(item);
    if (item.subitems?.length) {
      flat.push(...flattenToc(item.subitems));
    }
  });
  return flat;
}

function getSourceLabel(source: string) {
  if (source === 'standardebooks') return 'Standard Ebooks';
  if (source === 'gutendex') return 'Project Gutenberg';
  return 'Open archive';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EpubReader({
  book,
  url,
  activeSector,
  onSectorChange,
  onBack,
  isBookmarked,
  isBookmarkLoading,
  onToggleBookmark,
  hasUser,
  userId,
}: EpubReaderProps) {
  const { uiMode } = useReaderSettings();
  const { suspendMusic, resumeMusic } = useAudio();

  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tocEntries, setTocEntries] = useState<TOCEntry[]>([]);
  const [chapterLabel, setChapterLabel] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showTOC, setShowTOC] = useState(false);
  const [location, setLocation] = useState<string | null>(null);
  const [direction, setDirection] = useState(0);

  // Suspend audio when reading
  useEffect(() => {
    void suspendMusic();
    return () => {
      void resumeMusic();
    };
  }, [suspendMusic, resumeMusic]);

  // -----------------------------------------------------------------------
  // Load EPUB
  // -----------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadEpub() {
      setIsLoading(true);
      setError(null);

      try {
        // Build proxied URL
        const epubUrl = url.startsWith('http')
          ? `/api/proxy?url=${encodeURIComponent(url)}`
          : url;

        const book = ePub(epubUrl);

        // Wait for the book to be ready
        await book.ready;

        if (cancelled) {
          book.destroy();
          return;
        }

        bookRef.current = book;

        // Extract TOC
        const navigation = await book.loaded.navigation;
        if (cancelled) {
          book.destroy();
          return;
        }

        const flatToc = flattenToc(navigation.toc);
        const entries: TOCEntry[] = flatToc.map((item, index) => ({
          title: item.label.trim(),
          sectorIndex: index,
          chapterIndex: index,
          pageCount: 1,
        }));

        setTocEntries(entries);
        setTotalPages(book.locations?.length() || flatToc.length || 1);

        // Render into the viewer element
        if (!viewerRef.current) {
          book.destroy();
          return;
        }

        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          spread: 'none',
          flow: 'paginated',
          allowScriptedContent: false,
        });

        renditionRef.current = rendition;

        // Apply theme-aware styles
        const isDark =
          typeof document !== 'undefined' &&
          document.documentElement.classList.contains('dark');

        rendition.themes.default({
          body: {
            'background-color': isDark ? '#0a0f0d' : '#ffffff',
            color: isDark ? '#e0e0e0' : '#1a1a1a',
            'font-family': 'var(--font-reader), Space Grotesk, Georgia, serif',
            'line-height': '1.8',
            padding: '24px',
          },
          p: {
            'margin-bottom': '1em',
          },
          h1: {
            'font-family': 'var(--font-headline), Orbitron, sans-serif',
            color: isDark ? '#00ffc8' : '#0a6e4f',
            'font-size': '1.5em',
            'margin-bottom': '0.75em',
          },
          h2: {
            'font-family': 'var(--font-headline), Orbitron, sans-serif',
            color: isDark ? '#00ffc8' : '#0a6e4f',
            'font-size': '1.25em',
            'margin-bottom': '0.5em',
          },
          h3: {
            'font-family': 'var(--font-headline), Orbitron, sans-serif',
            color: isDark ? '#00ffc8' : '#0a6e4f',
            'font-size': '1.1em',
            'margin-bottom': '0.5em',
          },
          a: {
            color: isDark ? '#00ffc8' : '#0a6e4f',
          },
          '::selection': {
            background: isDark ? 'rgba(0, 255, 200, 0.25)' : 'rgba(10, 110, 79, 0.2)',
          },
        });

        // Display the first section
        await rendition.display();

        if (cancelled) {
          rendition.destroy();
          book.destroy();
          return;
        }

        // Listen for location changes
        rendition.on('relocated', (location: any) => {
          if (cancelled) return;

          const currentHref = location?.start?.href || '';
          setCurrentPage(location?.start?.displayed?.page || 1);
          setTotalPages(location?.start?.displayed?.total || 1);
          setLocation(location?.start?.href || null);

          // Find matching TOC entry
          const matchingEntry = flatToc.find((item) => {
            const itemHref = item.href.split('#')[0];
            const currentClean = currentHref.split('#')[0];
            return itemHref === currentClean || currentClean.endsWith(itemHref) || itemHref.endsWith(currentClean);
          });

          if (matchingEntry) {
            setChapterLabel(matchingEntry.label.trim());
            const entryIndex = flatToc.indexOf(matchingEntry);
            if (entryIndex >= 0) {
              onSectorChange(entryIndex);
            }
          }

          // Calculate progress
          if (book.locations?.length()) {
            const currentLocation = book.locations?.locationFromCfi?.(location?.start?.cfi);
            const pct = (currentLocation as any)?.percentage;
            if (typeof pct === 'number') {
              setProgress(pct * 100);
            }
          }
        });

        // Generate locations for progress tracking (optional, may be slow for large books)
        try {
          await book.locations.generate(1024);
          if (!cancelled) {
            setTotalPages(book.locations.length());
          }
        } catch {
          // Location generation is optional — TOC-based navigation still works
        }

        setIsLoading(false);
      } catch (loadError) {
        if (!cancelled) {
          console.error('[EpubReader] Load error:', loadError);
          setError(
            loadError instanceof Error
              ? `Could not load this EPUB: ${loadError.message}`
              : 'Could not load this EPUB.',
          );
          setIsLoading(false);
        }
      }
    }

    void loadEpub();

    return () => {
      cancelled = true;
      renditionRef.current?.destroy();
      bookRef.current?.destroy();
    };
  }, [url, onSectorChange]);

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------
  const goToNextPage = useCallback(() => {
    renditionRef.current?.next();
  }, []);

  const goToPrevPage = useCallback(() => {
    renditionRef.current?.prev();
  }, []);

  const goToLocation = useCallback(
    (href: string) => {
      renditionRef.current?.display(href);
      setShowTOC(false);
    },
    [],
  );

  const goToChapterIndex = useCallback(
    (sectorIndex: number) => {
      const entry = tocEntries[sectorIndex];
      if (entry) {
        const flatToc = flattenToc(
          bookRef.current?.navigation?.toc as any || [],
        );
        const match = flatToc.find(
          (item) => item.label.trim() === entry.title,
        );
        if (match) {
          goToLocation(match.href);
        }
      }
    },
    [tocEntries, goToLocation],
  );

  // Keyboard navigation
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') goToPrevPage();
      if (event.key === 'ArrowRight') goToNextPage();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goToNextPage, goToPrevPage]);

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle className="h-6 w-6 animate-spin text-accent" />
          <p>
            {uiMode === 'lounge'
              ? 'Preparing your reading room...'
              : 'Decoding EPUB transmission...'}
          </p>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------
  if (error) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background text-destructive">
        <div className="flex max-w-md flex-col items-center gap-4 text-center px-4">
          <AlertTriangle className="h-8 w-8" />
          <p className="font-headline text-lg">
            {uiMode === 'lounge'
              ? 'We could not open this ebook'
              : 'EPUB_DECODE_ERROR'}
          </p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            onClick={onBack}
          >
            Go back
          </Button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Source label
  // -----------------------------------------------------------------------
  const sourceLabel = getSourceLabel(book.source);

  // -----------------------------------------------------------------------
  // Lounge mode
  // -----------------------------------------------------------------------
  if (uiMode === 'lounge') {
    return (
      <div className="library-reader-shell">
        <header className="library-reader-header library-reader-header-sticky">
          <div className="library-reader-title-row">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <p className="library-kicker">Reading room</p>
              <h1>{book.title}</h1>
              <p>
                {book.authors || 'Unknown author'} . {sourceLabel} . EPUB
              </p>
            </div>
          </div>

          <div className="library-reader-actions">
            <AudioControls />
            <ThemeToggleButton
              compact
              className="border-accent/30 hover:bg-accent/10 hover:text-accent"
            />
            <Button
              variant="outline"
              size="sm"
              className="library-reader-guide-button"
              onClick={() => setShowTOC(true)}
            >
              <List className="mr-2 h-4 w-4" />
              Chapter guide
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onToggleBookmark}
              disabled={isBookmarkLoading || !hasUser}
              aria-label="Bookmark this page"
            >
              {isBookmarkLoading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Bookmark
                  className={`h-4 w-4 ${isBookmarked ? 'fill-accent text-accent' : ''}`}
                />
              )}
            </Button>
          </div>
        </header>

        <div className="library-reader-progress-track">
          <div style={{ width: `${progress}%` }} />
        </div>

        <main className="library-reader-layout">
          <aside className="library-reader-sidebar">
            <div className="library-reader-summary-card">
              <p className="library-kicker">Where you are</p>
              <h2>{chapterLabel || book.title}</h2>
              <div className="library-reader-summary-grid">
                <div>
                  <span>Book progress</span>
                  <strong>{progress.toFixed(1)}% through the book</strong>
                </div>
                <div>
                  <span>Current page</span>
                  <strong>
                    Page {currentPage} of {totalPages} in section
                  </strong>
                </div>
              </div>
            </div>

            <div className="library-reader-chapters">
              {tocEntries.map((entry, index) => {
                const isActive = activeSector === index;
                return (
                  <button
                    key={`${entry.title}-${entry.sectorIndex}`}
                    type="button"
                    onClick={() => goToChapterIndex(index)}
                    className={isActive ? 'active' : ''}
                  >
                    <span>
                      Chapter {String(entry.chapterIndex + 1).padStart(2, '0')}
                    </span>
                    <strong>{entry.title}</strong>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="library-reader-content">
            <div className="library-reader-banner">
              <div>
                <p className="library-kicker">Current passage</p>
                <h2>{chapterLabel || book.title}</h2>
              </div>
              <div className="library-reader-banner-meta">
                <span>
                  Page {currentPage} / {totalPages}
                </span>
                <span>{progress.toFixed(1)}% decoded</span>
              </div>
            </div>

            <div
              ref={viewerRef}
              className="library-reader-sheet-viewport"
              style={{ overflow: 'hidden', position: 'relative' }}
            />

            <div className="library-reader-dock">
              <div className="library-reader-dock-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goToPrevPage}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  <span className="reader-nav-label-full">Previous page</span>
                  <span className="reader-nav-label-compact">Previous</span>
                </Button>
                <Button type="button" onClick={goToNextPage}>
                  <span className="reader-nav-label-full">Next page</span>
                  <span className="reader-nav-label-compact">Next</span>
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>
        </main>

        {showTOC && (
          <TOCModal
            toc={tocEntries}
            activeSector={activeSector}
            onClose={() => setShowTOC(false)}
            onSelect={(index) => goToChapterIndex(index)}
          />
        )}
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Classic / terminal mode
  // -----------------------------------------------------------------------
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border/40 bg-background/90 px-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="truncate font-headline text-sm text-accent">
              {book.title}
            </div>
            <div className="truncate text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {book.authors} / {sourceLabel.toUpperCase()} EPUB
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <AudioControls />
          <ThemeToggleButton
            compact
            className="border-border/50 text-muted-foreground hover:text-accent"
          />
          {tocEntries.length > 0 && (
            <Button variant="ghost" size="icon" onClick={() => setShowTOC(true)}>
              <List className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleBookmark}
            disabled={isBookmarkLoading || !hasUser}
          >
            {isBookmarkLoading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Bookmark
                className={`h-4 w-4 ${isBookmarked ? 'fill-accent text-accent' : ''}`}
              />
            )}
          </Button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden min-h-0 overflow-hidden border-r border-border/40 bg-card/40 lg:flex lg:min-h-0 lg:flex-col">
          <div className="border-b border-border/40 px-4 py-4">
            <p className="font-headline text-xs tracking-[0.28em] text-accent">
              READER MAP
            </p>
            <div className="mt-3 space-y-3">
              <div className="border border-accent/15 bg-background/60 px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  Current chapter
                </div>
                <div className="mt-1 text-sm text-foreground">
                  {chapterLabel || book.title}
                </div>
              </div>
              <div className="border border-accent/15 bg-background/60 px-3 py-3">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  <span>Progress</span>
                  <span>{progress.toFixed(1)}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-accent/10">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <div className="mb-2 flex items-center gap-2 px-1 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              <List className="h-3.5 w-3.5" />
              Chapter index
            </div>
            <div className="space-y-2">
              {tocEntries.map((entry, index) => {
                const isActive = activeSector === index;
                return (
                  <button
                    key={`${entry.title}-${entry.sectorIndex}`}
                    type="button"
                    onClick={() => goToChapterIndex(index)}
                    className={`w-full border px-3 py-3 text-left transition ${
                      isActive
                        ? 'border-accent/40 bg-accent/10 text-accent'
                        : 'border-transparent bg-transparent text-muted-foreground hover:border-accent/20 hover:bg-accent/5 hover:text-foreground'
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground/80">
                      Chapter {String(entry.chapterIndex + 1).padStart(2, '0')}
                    </div>
                    <div className="mt-1 text-sm">{entry.title}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="relative flex min-h-0 flex-col overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-scanner bg-repeat opacity-40" />

          <div className="relative z-10 border-b border-border/40 bg-card/50 px-5 py-4 backdrop-blur-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  EPUB TRANSMISSION
                </div>
                <h2 className="mt-1 font-headline text-xl text-accent">
                  {chapterLabel || book.title}
                </h2>
              </div>
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Page {currentPage} / {totalPages} / {progress.toFixed(1)}% decoded
              </div>
            </div>
          </div>

          <div
            ref={viewerRef}
            className="relative flex-1 min-h-0 overflow-hidden"
            style={{ WebkitOverflowScrolling: 'touch' }}
          />
        </section>
      </main>

      {/* Fixed bottom navigation bar */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-border/40 bg-background/95 px-4 py-2 backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevPage}
            className="text-muted-foreground hover:text-accent"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">
            Page {currentPage} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextPage}
            className="text-muted-foreground hover:text-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showTOC && (
        <TOCModal
          toc={tocEntries}
          activeSector={activeSector}
          onClose={() => setShowTOC(false)}
          onSelect={(index) => goToChapterIndex(index)}
        />
      )}
    </div>
  );
}
