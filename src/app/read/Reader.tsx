'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  LoaderCircle,
  AlertTriangle,
  List,
  Settings,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import ReaderControls from '@/components/ReaderControls';
import TOCModal from './TOCModal';
import useBookLoader from '@/hooks/useBookLoader';
import useBookmark from '@/hooks/useBookmark';
import { useAuth } from '@/context/auth-provider';
import { useReaderSettings } from '@/context/reader-settings-provider';

export default function Reader() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { uiMode } = useReaderSettings();

  const {
    book,
    isLoading,
    error,
    toc,
    sectors,
    currentSector,
    currentChapter,
    activeSector,
    setActiveSector,
    direction,
    setDirection,
  } = useBookLoader(searchParams);

  const { isBookmarked, isBookmarkLoading, isWebBook, toggleBookmark } =
    useBookmark(user, book, activeSector, sectors.length);

  const [showTOC, setShowTOC] = useState(false);

  const paginate = useCallback(
    (delta: number) => {
      const next = activeSector + delta;
      if (next >= 0 && next < sectors.length) {
        setDirection(delta);
        setActiveSector(next);
      }
    },
    [activeSector, sectors.length, setActiveSector, setDirection],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        paginate(-1);
      }
      if (event.key === 'ArrowRight') {
        paginate(1);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paginate]);

  const activeChapterIndex = currentSector?.chapterIndex ?? 0;
  const completion =
    sectors.length > 0 ? ((activeSector + 1) / sectors.length) * 100 : 0;
  const progressLabel = useMemo(() => {
    if (!currentSector) {
      return '0% complete';
    }

    return uiMode === 'lounge'
      ? `${completion.toFixed(1)}% read`
      : `${completion.toFixed(1)}% decoded`;
  }, [completion, currentSector, uiMode]);

  const pageLabel = currentSector
    ? `Page ${String(activeSector + 1).padStart(3, '0')} / ${String(sectors.length).padStart(3, '0')}`
    : 'Page 000 / 000';

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? '10%' : '-10%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir < 0 ? '10%' : '-10%', opacity: 0 }),
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle className="h-6 w-6 animate-spin text-accent" />
          <p>Rendering indexed transmission...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-destructive">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <AlertTriangle className="h-8 w-8" />
          <p className="font-headline text-lg">TRANSMISSION_ERROR</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (uiMode === 'lounge') {
    return (
      <div className="library-reader-shell">
        <header className="library-reader-header">
          <div className="library-reader-title-row">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <p className="library-kicker">Now reading</p>
              <h1>{book?.title}</h1>
              <p>{book?.authors || 'Unknown author'}</p>
            </div>
          </div>

          <div className="library-reader-actions">
            {toc.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setShowTOC(true)}>
                <List className="mr-2 h-4 w-4" />
                Chapters
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleBookmark}
              disabled={isBookmarkLoading || !user || isWebBook}
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
            <Button variant="outline" size="icon" onClick={() => router.push('/settings')}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="library-reader-progress-track">
          <div style={{ width: `${completion}%` }} />
        </div>

        <main className="library-reader-grid">
          <aside className="library-reader-index">
            <div className="library-reader-index-card">
              <p className="library-kicker">Reading map</p>
              <h2>{currentChapter?.title ?? 'Opening'}</h2>
              <div className="library-reader-meter">
                <span>{progressLabel}</span>
                <strong>{pageLabel}</strong>
              </div>
            </div>

            <div className="library-reader-chapters">
              {toc.map((entry, index) => {
                const nextEntry = toc[index + 1];
                const isActive =
                  activeSector >= entry.sectorIndex &&
                  (!nextEntry || activeSector < nextEntry.sectorIndex);

                return (
                  <button
                    key={`${entry.title}-${entry.sectorIndex}`}
                    type="button"
                    onClick={() => {
                      setDirection(entry.sectorIndex > activeSector ? 1 : -1);
                      setActiveSector(entry.sectorIndex);
                    }}
                    className={isActive ? 'active' : ''}
                  >
                    <span>Chapter {String(entry.chapterIndex + 1).padStart(2, '0')}</span>
                    <strong>{entry.title}</strong>
                    <small>{entry.pageCount} pages</small>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="library-reader-stage">
            <AnimatePresence initial={false} custom={direction}>
              <motion.article
                key={activeSector}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: 'spring', stiffness: 220, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                className="library-reader-page-card"
              >
                <div className="library-reader-page-meta">
                  <span>Chapter {String(activeChapterIndex + 1).padStart(2, '0')}</span>
                  <span>{pageLabel}</span>
                </div>
                <h2>{currentSector?.chapterTitle ?? book?.title}</h2>
                <div className="library-reader-prose">
                  {currentSector?.paragraphs.map((paragraph, index) => (
                    <p key={`${currentSector.startParagraphIndex}-${index}`}>
                      {paragraph.trim()}
                    </p>
                  ))}
                </div>
              </motion.article>
            </AnimatePresence>
          </section>
        </main>

        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="pointer-events-auto">
            <ReaderControls
              onPrev={() => paginate(-1)}
              onNext={() => paginate(1)}
              isFirst={activeSector === 0}
              isLast={activeSector === sectors.length - 1}
              progressLabel={progressLabel}
              pageLabel={pageLabel}
            />
          </div>
        </div>

        {showTOC && (
          <TOCModal
            toc={toc}
            activeSector={activeSector}
            onClose={() => setShowTOC(false)}
            onSelect={(index) => {
              setDirection(index > activeSector ? 1 : -1);
              setActiveSector(index);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border/40 bg-background/90 px-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="truncate font-headline text-sm text-accent">
              {book?.title}
            </div>
            <div className="truncate text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {book?.authors} / {book?.source.toUpperCase()} ID_{book?.id.slice(-10)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {toc.length > 0 && (
            <Button variant="ghost" size="icon" onClick={() => setShowTOC(true)}>
              <List className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleBookmark}
            disabled={isBookmarkLoading || !user || isWebBook}
          >
            {isBookmarkLoading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Bookmark
                className={`h-4 w-4 ${isBookmarked ? 'fill-accent text-accent' : ''}`}
              />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => router.push('/settings')}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="grid flex-1 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border/40 bg-card/40 lg:flex lg:flex-col">
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
                  {currentChapter?.title ?? 'Opening'}
                </div>
              </div>
              <div className="border border-accent/15 bg-background/60 px-3 py-3">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  <span>Progress</span>
                  <span>{completion.toFixed(1)}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-accent/10">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <div className="mb-2 flex items-center gap-2 px-1 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              Chapter index
            </div>
            <div className="space-y-2">
              {toc.map((entry, index) => {
                const nextEntry = toc[index + 1];
                const isActive =
                  activeSector >= entry.sectorIndex &&
                  (!nextEntry || activeSector < nextEntry.sectorIndex);

                return (
                  <button
                    key={`${entry.title}-${entry.sectorIndex}`}
                    type="button"
                    onClick={() => {
                      setDirection(entry.sectorIndex > activeSector ? 1 : -1);
                      setActiveSector(entry.sectorIndex);
                    }}
                    className={`w-full border px-3 py-3 text-left transition ${
                      isActive
                        ? 'border-accent/40 bg-accent/10 text-accent'
                        : 'border-transparent bg-transparent text-muted-foreground hover:border-accent/20 hover:bg-accent/5 hover:text-foreground'
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground/80">
                      Chapter {String(entry.chapterIndex + 1).padStart(2, '0')} / {entry.pageCount} pages
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
                  Chapter {String(activeChapterIndex + 1).padStart(2, '0')}
                </div>
                <h2 className="mt-1 font-headline text-xl text-accent">
                  {currentSector?.chapterTitle ?? book?.title}
                </h2>
              </div>
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                {pageLabel} / {progressLabel}
              </div>
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden">
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={activeSector}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: 'spring', stiffness: 220, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                className="absolute inset-0 overflow-auto"
              >
                <article className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-5 py-8 pb-36 sm:px-8">
                  <div className="border border-accent/15 bg-card/80 p-6 shadow-[0_0_35px_rgba(0,255,200,0.12)] backdrop-blur-sm sm:p-8">
                    <div className="mb-6 flex items-center justify-between gap-4 border-b border-accent/10 pb-4">
                      <div>
                        <div className="font-headline text-xs uppercase tracking-[0.32em] text-accent">
                          {currentSector?.chapterTitle}
                        </div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                          page {currentSector?.pageNumberInChapter} of {currentSector?.pageCountInChapter} in chapter
                        </div>
                      </div>
                      <div className="text-right text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                        archive sector {String(activeSector + 1).padStart(3, '0')}
                      </div>
                    </div>

                    <div className="space-y-5 font-reader text-[15px] leading-8 text-foreground sm:text-base">
                      {currentSector?.paragraphs.map((paragraph, index) => (
                        <p key={`${currentSector.startParagraphIndex}-${index}`}>
                          {paragraph.trim()}
                        </p>
                      ))}
                    </div>
                  </div>
                </article>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
            <div className="pointer-events-auto">
              <ReaderControls
                onPrev={() => paginate(-1)}
                onNext={() => paginate(1)}
                isFirst={activeSector === 0}
                isLast={activeSector === sectors.length - 1}
                progressLabel={progressLabel}
                pageLabel={pageLabel}
              />
            </div>
          </div>
        </section>
      </main>

      {showTOC && (
        <TOCModal
          toc={toc}
          activeSector={activeSector}
          onClose={() => setShowTOC(false)}
          onSelect={(index) => {
            setDirection(index > activeSector ? 1 : -1);
            setActiveSector(index);
          }}
        />
      )}
    </div>
  );
}