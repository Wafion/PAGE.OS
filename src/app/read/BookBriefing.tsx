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

  if (uiMode === 'classic') {
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

  // Modern Motion UI (Default)
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12 text-foreground overflow-hidden">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-[#6c55db]/10 blur-[120px]" />
      
      <motion.div
        className="relative z-10 w-full max-w-4xl overflow-hidden rounded-3xl border border-border/40 bg-card/75 shadow-2xl backdrop-blur-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 26 }}
      >
        <div className="flex flex-col md:flex-row">
          {/* Cover column */}
          <div className="relative flex shrink-0 items-center justify-center bg-muted/20 p-8 md:w-5/12 md:p-12">
            <div className="absolute inset-0 bg-gradient-to-br from-[#6c55db]/15 to-transparent opacity-60" />
            
            <div className="relative z-10">
              {cover && !coverFailed ? (
                <div className="relative aspect-[2/3] w-48 overflow-hidden rounded-xl border border-white/10 shadow-2xl shadow-black/60 transition-transform duration-500 hover:scale-105 sm:w-56">
                  <Image
                    src={cover}
                    alt={`Cover of ${book?.title ?? 'book'}`}
                    fill
                    className="object-cover"
                    unoptimized
                    onError={() => setCoverFailed(true)}
                  />
                </div>
              ) : (
                <div className="flex aspect-[2/3] w-48 flex-col items-center justify-center rounded-xl border border-border/50 bg-muted/40 shadow-xl sm:w-56">
                  <BookOpen className="h-12 w-12 text-muted-foreground/40" />
                  <span className="mt-3 text-xs uppercase tracking-widest text-muted-foreground/60">No Cover</span>
                </div>
              )}
            </div>
          </div>

          {/* Details column */}
          <div className="flex flex-1 flex-col justify-between p-7 sm:p-10">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#6c55db]/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#6c55db]">
                  {book?.source === 'gutendex' ? 'Project Gutenberg' : 'Open Archive'}
                </span>
                {details?.id && (
                  <span className="rounded-full border border-border/50 bg-muted/30 px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    #{details.id}
                  </span>
                )}
                {details?.languages?.[0] && (
                  <span className="rounded-full border border-border/50 bg-muted/30 px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {details.languages[0].toUpperCase()}
                  </span>
                )}
              </div>

              <h1 className="mb-2 font-motion text-2xl font-semibold italic tracking-tight text-foreground sm:text-3xl md:text-4xl">
                {book?.title ?? 'Preparing book…'}
              </h1>
              <p className="mb-6 text-sm font-medium text-muted-foreground sm:text-base">
                by <span className="text-foreground/90">{book?.authors || 'Unknown author'}</span>
                {lifespan ? <span className="ml-1 text-xs text-muted-foreground">({lifespan})</span> : null}
              </p>

              {/* Synopsis */}
              <div className="mb-6 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6c55db]">
                  Synopsis
                </p>
                {isLoading ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#6c55db] border-t-transparent" />
                    <span>Extracting book record…</span>
                  </div>
                ) : summary ? (
                  <p className="max-h-48 overflow-y-auto text-sm leading-relaxed text-foreground/80 pr-2">
                    {summary}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground/70">
                    No synopsis available for this title yet. Open the reader to discover the text directly.
                  </p>
                )}
              </div>

              {/* Shelves & Genres */}
              {genres.length > 0 && (
                <div className="mb-6">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Categories
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {genres.slice(0, 4).map((genre) => (
                      <span
                        key={genre}
                        className="rounded-full border border-border/40 bg-muted/30 px-2.5 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center gap-3 pt-4 border-t border-border/40">
              <Button
                onClick={onStart}
                size="lg"
                className="flex-1 min-w-[180px] gap-2 rounded-full bg-[#6c55db] text-white hover:bg-[#6c55db]/90 shadow-lg shadow-[#6c55db]/25 font-medium transition-transform hover:scale-[1.02]"
              >
                <BookOpen className="h-4 w-4" />
                Start reading
              </Button>
              <Button
                onClick={onBack}
                variant="outline"
                size="lg"
                className="rounded-full border-border/50 hover:bg-muted/50 transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to library
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
