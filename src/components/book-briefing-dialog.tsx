"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BookOpen, X, LoaderCircle, Bookmark, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SearchResult } from "@/adapters/sourceManager";
import { useBookDetails } from "@/hooks/useBookDetails";

export function BookBriefingDialog({
  book,
  open,
  onOpenChange,
}: {
  book: SearchResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { details, isLoading } = useBookDetails(book);

  if (!book) return null;

  const handleStartReading = () => {
    onOpenChange(false);
    
    const params = new URLSearchParams();
    params.set("source", book.source);
    params.set("id", book.id);
    params.set("title", book.title);
    params.set("authors", book.authors);

    if (book.source === "gutendex") {
      params.set("formats", JSON.stringify(book.formats || {}));
    }
    
    router.push(`/read?${params.toString()}`);
  };

  const coverUrl = book.source === "gutendex" 
    ? `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.cover.medium.jpg` 
    : undefined;

  const summary = details?.summaries?.[0] || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden rounded-2xl border border-border/40 bg-background/80 p-0 shadow-2xl backdrop-blur-xl sm:rounded-3xl">
        <DialogTitle className="sr-only">Book Briefing for {book.title}</DialogTitle>
        <div className="flex max-h-[85vh] flex-col md:flex-row">
          
          {/* Cover Section */}
          <div className="relative w-full shrink-0 bg-muted/20 p-8 md:w-2/5 md:p-10">
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#6c55db]/10 to-transparent opacity-50" />
            
            <div className="relative z-10 flex h-full flex-col items-center justify-center">
              {coverUrl ? (
                <div className="relative aspect-[2/3] w-full max-w-[200px] overflow-hidden rounded-md shadow-2xl transition-transform hover:scale-105">
                  <Image src={coverUrl} alt={`Cover for ${book.title}`} fill className="object-cover" />
                </div>
              ) : (
                <div className="flex aspect-[2/3] w-full max-w-[200px] flex-col items-center justify-center rounded-md border border-border/50 bg-muted/40 shadow-xl">
                  <BookOpen className="h-12 w-12 text-muted-foreground/50" />
                  <span className="mt-4 text-xs tracking-widest text-muted-foreground/70 uppercase">No Cover</span>
                </div>
              )}
            </div>
          </div>

          {/* Details Section */}
          <div className="flex w-full flex-col justify-between p-8 md:p-10 overflow-y-auto custom-scrollbar">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-[#6c55db]/15 px-2.5 py-1 text-[10px] font-medium tracking-widest text-[#6c55db] uppercase">
                  {book.source === "gutendex" ? "Project Gutenberg" : "Open Archive"}
                </span>
                <span className="rounded-full border border-border/40 px-2.5 py-1 text-[10px] tracking-widest text-muted-foreground uppercase">
                  ID: {book.id}
                </span>
              </div>
              
              <h2 className="mb-1 text-2xl font-semibold tracking-tight text-foreground md:text-3xl font-motion italic">
                {book.title}
              </h2>
              <p className="mb-8 text-sm text-muted-foreground">
                By <span className="font-medium text-foreground/80">{book.authors || "Unknown"}</span>
              </p>

              <div className="mb-8">
                <h3 className="mb-3 text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">Synopsis</h3>
                {isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <LoaderCircle className="h-4 w-4 animate-spin text-[#6c55db]" />
                    <span>Extracting archives...</span>
                  </div>
                ) : summary ? (
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {summary}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground/60">
                    No transmission summary could be recovered for this artifact. Proceed with caution.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Button onClick={handleStartReading} className="flex-1 gap-2 rounded-full bg-[#6c55db] text-white hover:bg-[#6c55db]/90 shadow-lg shadow-[#6c55db]/20">
                <BookOpen className="h-4 w-4" />
                Start Reading
              </Button>
              <Button variant="outline" size="icon" className="shrink-0 rounded-full border-border/50 hover:bg-muted/50">
                <Bookmark className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button variant="outline" size="icon" className="shrink-0 rounded-full border-border/50 hover:bg-muted/50">
                <Share2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
