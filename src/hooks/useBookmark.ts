'use client';

import { useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import type { SearchResult } from '@/adapters/sourceManager';
import {
  addBookToLibrary,
  getLibraryBook,
  removeBookFromLibrary,
  updateBookProgress,
  generateBookId
} from '@/services/userData';
import { useToast } from '@/hooks/use-toast';

export default function useBookmark(
  user: User | null,
  book: SearchResult | null,
  activeSector: number,
  sectorsCount: number
) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
  const { toast } = useToast();

  // ✅ Correct logic: Only block bookmarking if source is "web"
  const isWebBook = book?.source === 'web';
  const bookId = book ? generateBookId(book) : null;

  // ✅ Load bookmark state on mount
  useEffect(() => {
    if (!user || !bookId || isWebBook) {
      setIsBookmarked(false);
      return;
    }

    setIsBookmarkLoading(true);
    getLibraryBook(user.uid, bookId)
      .then(libraryBook => {
        setIsBookmarked(!!libraryBook);
      })
      .catch(console.error)
      .finally(() => setIsBookmarkLoading(false));
  }, [user, bookId, isWebBook]);

  // ✅ Auto-sync reading progress if book is bookmarked
  useEffect(() => {
    if (!user || !bookId || !isBookmarked || sectorsCount === 0) return;

    const handler = setTimeout(() => {
      const progress = {
        percentage: ((activeSector + 1) / sectorsCount) * 100,
        lastReadSector: activeSector,
      };
      updateBookProgress(user.uid, bookId, progress).catch(console.error);
    }, 1500);

    return () => clearTimeout(handler);
  }, [activeSector, sectorsCount, user, bookId, isBookmarked]);

  // ✅ Handles adding/removing bookmark with toast feedback
  const toggleBookmark = useCallback(async () => {
    if (!user || !book || !bookId || isWebBook) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save books to your library.",
        variant: 'destructive',
      });
      return;
    }

    setIsBookmarkLoading(true);
    try {
      if (isBookmarked) {
        await removeBookFromLibrary(user.uid, bookId);
        setIsBookmarked(false);
        toast({ title: 'Removed from Archive' });
      } else {
        await addBookToLibrary(user.uid, book);
        setIsBookmarked(true);
        toast({ title: 'Saved to Archive' });
      }
    } catch (error) {
      console.error('Failed to toggle bookmark', error);
      toast({
        title: 'Error',
        description: 'Could not update your library. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsBookmarkLoading(false);
    }
  }, [isBookmarked, user, book, bookId, isWebBook, toast]);

  return { isBookmarked, isBookmarkLoading, isWebBook, toggleBookmark };
}
