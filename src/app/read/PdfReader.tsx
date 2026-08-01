'use client';

import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, ZoomIn, ZoomOut } from 'lucide-react';
import type { SearchResult } from '@/adapters/sourceManager';
import { Button } from '@/components/ui/button';
import { generateBookId, updateBookProgress } from '@/services/userData';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

type PdfReaderProps = {
  book: SearchResult;
  url: string;
  activePage: number;
  onPageChange: (pageIndex: number) => void;
  onBack: () => void;
  isBookmarked: boolean;
  isBookmarkLoading: boolean;
  onToggleBookmark: () => void;
  hasUser: boolean;
  userId?: string;
};

export default function PdfReader({
  book,
  url,
  activePage,
  onPageChange,
  onBack,
  isBookmarked,
  isBookmarkLoading,
  onToggleBookmark,
  hasUser,
  userId,
}: PdfReaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [documentProxy, setDocumentProxy] = useState<any>(null);
  const [pageCount, setPageCount] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadingTask = pdfjsLib.getDocument({
      url: `/api/proxy?url=${encodeURIComponent(url)}`,
    });

    loadingTask.promise
      .then((pdf) => {
        if (cancelled) return;
        setDocumentProxy(pdf);
        setPageCount(pdf.numPages);
        setIsLoading(false);
      })
      .catch((loadError) => {
        if (cancelled) return;
        console.error('PDF loading error:', loadError);
        setError('PAGE.OS could not render this archive PDF. Try opening the source file instead.');
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      void loadingTask.destroy();
    };
  }, [url]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const resizeObserver = new ResizeObserver(([entry]) => {
      setViewportWidth(entry.contentRect.width);
    });
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!documentProxy || !canvasRef.current || viewportWidth === 0) return;
    let cancelled = false;
    let renderTask: any;

    const renderPage = async () => {
      try {
        const page = await documentProxy.getPage(Math.min(Math.max(activePage + 1, 1), pageCount));
        if (cancelled || !canvasRef.current) return;
        const naturalViewport = page.getViewport({ scale: 1 });
        const scale = Math.max(0.5, ((viewportWidth - 32) / naturalViewport.width) * zoom);
        const viewport = page.getViewport({ scale });
        const pixelRatio = window.devicePixelRatio || 1;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;
      } catch (renderError) {
        if (!cancelled && (renderError as Error).name !== 'RenderingCancelledException') {
          console.error('PDF rendering error:', renderError);
          setError('This PDF page could not be rendered.');
        }
      }
    };

    void renderPage();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [activePage, documentProxy, pageCount, viewportWidth, zoom]);

  useEffect(() => {
    if (!isBookmarked || !userId || pageCount === 0) return;
    const timeout = window.setTimeout(() => {
      void updateBookProgress(userId, generateBookId(book), {
        percentage: ((activePage + 1) / pageCount) * 100,
        lastReadSector: activePage,
      }).catch((progressError) => console.error('Could not save PDF reading position:', progressError));
    }, 750);
    return () => window.clearTimeout(timeout);
  }, [activePage, book, isBookmarked, pageCount, userId]);

  const goToPage = (nextPage: number) => {
    onPageChange(Math.min(Math.max(nextPage, 0), Math.max(pageCount - 1, 0)));
  };
  const progress = pageCount ? ((activePage + 1) / pageCount) * 100 : 0;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <header className="flex min-h-14 items-center justify-between gap-3 border-b border-border/50 bg-background/95 px-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to search">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="truncate font-headline text-sm text-accent">{book.title}</p>
            <p className="truncate text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Open archive PDF · {book.authors}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setZoom((value) => Math.max(0.75, value - 0.15))} aria-label="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setZoom((value) => Math.min(1.6, value + 0.15))} aria-label="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onToggleBookmark} disabled={isBookmarkLoading || !hasUser} aria-label="Save PDF to library">
            {isBookmarkLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-accent text-accent' : ''}`} />}
          </Button>
          <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Open original PDF">
            <Button variant="ghost" size="icon"><ExternalLink className="h-4 w-4" /></Button>
          </a>
        </div>
      </header>

      <div className="h-1 bg-accent/10"><div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} /></div>

      <main ref={viewportRef} className="relative flex min-h-0 flex-1 items-start justify-center overflow-auto bg-muted/30 p-4 sm:p-8">
        {isLoading && <div className="mt-24 flex items-center gap-3 text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin text-accent" /> Loading archive PDF…</div>}
        {error && <div className="mt-24 max-w-md border border-destructive/30 bg-background p-6 text-center text-sm text-muted-foreground">{error}</div>}
        {!isLoading && !error && <canvas ref={canvasRef} className="max-w-none bg-white shadow-2xl" />}
      </main>

      <footer className="flex min-h-16 items-center justify-between gap-3 border-t border-border/50 bg-background px-3 sm:px-6">
        <Button variant="outline" onClick={() => goToPage(activePage - 1)} disabled={activePage === 0 || isLoading}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Previous
        </Button>
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Page {String(activePage + 1).padStart(2, '0')} / {String(pageCount).padStart(2, '0')}</span>
        <Button onClick={() => goToPage(activePage + 1)} disabled={activePage >= pageCount - 1 || isLoading}>
          Next <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </footer>
    </div>
  );
}
