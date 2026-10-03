"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import type { SearchResult } from "@/adapters/sourceManager";
import { BookBriefingDialog } from "@/components/book-briefing-dialog";

interface BookBriefingContextValue {
  showBriefing: (book: SearchResult) => void;
  hideBriefing: () => void;
}

const BookBriefingContext = createContext<BookBriefingContextValue | undefined>(undefined);

export function BookBriefingProvider({ children }: { children: ReactNode }) {
  const [activeBook, setActiveBook] = useState<SearchResult | null>(null);

  const showBriefing = (book: SearchResult) => {
    setActiveBook(book);
  };

  const hideBriefing = () => {
    setActiveBook(null);
  };

  return (
    <BookBriefingContext.Provider value={{ showBriefing, hideBriefing }}>
      {children}
      <BookBriefingDialog book={activeBook} open={!!activeBook} onOpenChange={(open) => !open && hideBriefing()} />
    </BookBriefingContext.Provider>
  );
}

export function useBookBriefing() {
  const context = useContext(BookBriefingContext);
  if (context === undefined) {
    throw new Error("useBookBriefing must be used within a BookBriefingProvider");
  }
  return context;
}
