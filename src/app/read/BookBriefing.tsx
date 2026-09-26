'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ArrowLeft, BookOpen, Download, Languages, Library, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { SearchResult } from '@/adapters/sourceManager';
import type { BookDetails } from '@/hooks/useBookDetails';
import { useReaderSettings } from '@/context/reader-settings-provider';

type BookBriefingProps = {
  book: SearchResult | null;
  details: BookDetails | null;
  isLoading: boolean;
  onStart: () => void;
  onBack: () => void;
};

function cleanSummary(summary: string): string {
  return summary
    .replace(/\s*--\s*/g, ' — ')
    .replace(/\s+/g, ' ')
    .trim();
}

function authorLifespan(details: BookDetails): string | null {
  if (details.birthYear === null && details.deathYear === null) {
    return null;
  }
  const birth = details.birthYear ?? '?';
  const death = details.deathYear ?? 'present';
  return `${birth} – ${death}`;
}

function coverUrl(book: SearchResult | null): string | null {
  if (!book || book.source !== 'gutendex') return null;
  return `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.cover.medium.jpg`;
}

export default function BookBriefing({
  book,
  details,
  isLoading,
  onStart,
  onBack,
}: BookBriefingProps) {
  const { uiMode } = useReaderSettings();
  const [coverFailed, setCoverFailed] = useState(false);

  const summary = details?.summaries?.[0] ? cleanSummary(details.summaries[0]) : null;
  const lifespan = details ? authorLifespan(details) : null;
  const genres = details?.bookshelves?.length
    ? details.bookshelves
    : details?.subjects?.slice(0, 6) ?? [];
  const cover = coverUrl(book);

  if (uiMode === 'lounge') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
        <motion.div
          className="library-reader-toc w-full max-w-3xl"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        >
          <div className="library-reader-toc-header">
            <div>
              <p className="library-kicker">Book briefing</p>
              <h2>{book?.title ?? 'Preparing…'}</h2>
              <p>{book?.authors || 'Unknown author'}</p>
            </div>
            <Button
              onClick={onBack}
              variant="ghost"
              size="icon"
              aria-label="Back to library"
              className="rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-6 px-1 pb-2">
            <div className="flex flex-col gap-5 sm:flex-row">
              {cover && !coverFailed && (
                <div className="w-32 shrink-0 overflow-hidden rounded-lg border border-accent/20 shadow-lg">
                  <Image
                    src={cover}
                    alt={`Cover of ${book?.title ?? 'book'}`}
                    width={128}
                    height={192}
                    className="h-auto w-full object-cover"
                    unoptimized
                    onError={() => setCoverFailed(true)}
                  />
                </div>
              )}

              <div className="min-w-0 flex-1 space-y-4">
                <section>
                  <p className="library-kicker">Synopsis</p>
                  {isLoading ? (
                    <p className="text-sm text-muted-foreground">Fetching summary…</p>
                  ) : summary ? (
                    <p className="text-sm leading-relaxed text-foreground/90">{summary}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No synopsis is available for this title yet — open the first page and let the
                      story introduce itself.
                    </p>
                  )}
                </section>

                {lifespan && (
                  <section>
                    <p className="library-kicker">About the author</p>
                    <p className="text-sm leading-relaxed text-foreground/90">
                      {details?.authors} ({lifespan}). A public-domain author whose full catalogue
                      is available through Project Gutenberg.
                    </p>
                  </section>
                )}
              </div>
            </div>

            {genres.length > 0 && (
              <section>
                <p className="library-kicker">Genre &amp; shelves</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {genres.map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {details && (
              <section className="grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
                <span className="flex items-center gap-2">
                  <Languages className="h-3.5 w-3.5" />{' '}
                  {(details.languages[0] ?? '?').toUpperCase()}
                </span>
                <span className="flex items-center gap-2">
                  <Download className="h-3.5 w-3.5" /> {details.downloadCount.toLocaleString()} downloads
                </span>
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5" /> Public domain
                </span>
                <span className="flex items-center gap-2">
                  <Library className="h-3.5 w-3.5" /> Gutenberg #{details.id}
                </span>
              </section>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                onClick={onStart}
                size="lg"
                className="library-reader-guide-button min-w-48"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Start reading
              </Button>
              <Button onClick={onBack} variant="outline" size="lg">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to library
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10 text-foreground">
      <motion.div
        className="w-full max-w-2xl overflow-hidden border border-accent/20 bg-[#07120f] shadow-[0_0_25px_#00ffc822]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
      >
        <div className="border-b border-accent/15 bg-accent/5 px-5 py-4">
          <p className="font-headline text-xs tracking-[0.3em] text-accent">TRANSMISSION BRIEFING</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Review the record before opening the reader.
          </p>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-5">
          <div className="flex flex-col gap-5 sm:flex-row">
            {cover && !coverFailed && (
              <div className="w-28 shrink-0 overflow-hidden border border-accent/20">
                <Image
                  src={cover}
                  alt={`Cover of ${book?.title ?? 'book'}`}
                  width={112}
                  height={168}
                  className="h-auto w-full object-cover"
                  unoptimized
                  onError={() => setCoverFailed(true)}
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70">Title</p>
              <h2 className="mt-1 font-headline text-lg">{book?.title ?? 'Loading…'}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{book?.authors ?? ''}</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70">Synopsis</p>
            {isLoading ? (
              <p className="mt-1 text-sm text-muted-foreground">Fetching summary…</p>
            ) : summary ? (
              <p className="mt-1 text-sm leading-relaxed text-foreground/90">{summary}</p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                No synopsis available for this transmission yet.
              </p>
            )}
          </div>

          {lifespan && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70">
                About the author
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/90">
                {details?.authors} ({lifespan}). Public-domain author, full catalogue on Project
                Gutenberg.
              </p>
            </div>
          )}

          {genres.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70">
                Genre &amp; shelves
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <span
                    key={genre}
                    className="border border-accent/30 bg-accent/5 px-2 py-1 text-xs text-accent"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {details && (
            <div className="grid grid-cols-2 gap-3 border-t border-accent/10 pt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <Languages className="h-3.5 w-3.5 text-accent" />{' '}
                {(details.languages[0] ?? '?').toUpperCase()}
              </span>
              <span className="flex items-center gap-2">
                <Download className="h-3.5 w-3.5 text-accent" />{' '}
                {details.downloadCount.toLocaleString()} downloads
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" /> Public domain
              </span>
              <span className="flex items-center gap-2">
                <Library className="h-3.5 w-3.5 text-accent" /> Gutenberg #{details.id}
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-accent/10 pt-4">
            <Button onClick={onStart} className="min-w-40">
              <BookOpen className="mr-2 h-4 w-4" />
              Start reading
            </Button>
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to library
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
