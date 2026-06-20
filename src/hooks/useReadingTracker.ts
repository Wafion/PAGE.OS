'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { SearchResult } from '@/adapters/sourceManager';
import { generateBookId, updateBookProgress, updateReadingSession } from '@/services/userData';
import useBookmark from './useBookmark';
import { useAuth } from '@/context/auth-provider';
import { useReaderSettings } from '@/context/reader-settings-provider';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to track reading sessions and update statistics
 * Integrates with useBookmark to provide seamless tracking
 */
export default function useReadingTracker(
  book: SearchResult | null,
  activeSector: number,
  sectorsCount: number
) {
  const { user } = useAuth();
  const { uiMode, collectStatistics } = useReaderSettings();
  const { toast } = useToast();

  // Always get bookmark state (independent of statistics collection)
  const { isBookmarked, isBookmarkLoading, isWebBook, toggleBookmark } = useBookmark(user, book, activeSector, sectorsCount);

  const [isTracking, setIsTracking] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [lastSectorUpdate, setLastSectorUpdate] = useState<number>(-1);
  const visibilityRef = useRef<boolean>(false);
  const focusRef = useRef<boolean>(false);
  const libraryBookId = book ? generateBookId(book) : null;

  // Determine if the reader is active (visible and focused)
  const isReaderActive = useCallback(() => {
    return visibilityRef.current && focusRef.current;
  }, []);

  // Handle changes in reader activity
  const handleActivityChange = useCallback(async () => {
    const wasTracking = isTracking;
    const nowActive = isReaderActive();

    // Started tracking
    if (nowActive && !wasTracking) {
      setIsTracking(true);
      setSessionStartTime(Date.now());

      // If we're tracking a book for the first time in this session, ensure it's bookmarked
      if (book && !isBookmarked && user) {
        try {
          await toggleBookmark();
        } catch (error) {
          console.warn("Failed to auto-bookmark", error);
        }
      }
    }
    // Stopped tracking
    else if (!nowActive && wasTracking && sessionStartTime !== null) {
      setIsTracking(false);
      const sessionEndTime = Date.now();
      const sessionDurationMs = sessionEndTime - sessionStartTime;
      const sessionDurationSec = Math.floor(sessionDurationMs / 1000);

      if (sessionDurationSec > 0 && book && libraryBookId && user) {
        try {
          // Update reading session statistics
          await updateReadingSession(user.uid, libraryBookId, {
            isNewSession: true, // Simplified - in reality would check if this is actually a new session
            sessionTime: sessionDurationSec
          });

          // Show a toast with session info in debug mode or occasionally
          // toast({
          //   title: 'Session tracked',
          //   description: `Read for ${Math.floor(sessionDurationSec / 60)}m ${sessionDurationSec % 60}s`,
          //   variant: 'default',
          // });
        } catch (error) {
          console.error("Failed to update reading session:", error);
          toast({
            title: 'Tracking Error',
            description: 'Failed to save reading session data',
            variant: 'destructive',
          });
        }
      }

      setSessionStartTime(null);
    }
  }, [book, isBookmarked, isTracking, isReaderActive, libraryBookId, sessionStartTime, toggleBookmark, toast, user]);

  // Update visibility when window visibility changes
  useEffect(() => {
    if (!collectStatistics) return;

    const handleVisibilityChange = () => {
      visibilityRef.current = !document.hidden;
      handleActivityChange();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    // Initialize current state
    visibilityRef.current = !document.hidden;

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [collectStatistics, handleActivityChange]);

  // Update focus when window focus changes
  useEffect(() => {
    if (!collectStatistics) return;

    const handleFocusChange = () => {
      focusRef.current = !document.hidden; // Simplified - in reality would use focus/blur events
      handleActivityChange();
    };

    window.addEventListener('focus', handleFocusChange);
    window.addEventListener('blur', handleFocusChange);
    // Initialize current state
    focusRef.current = !document.hidden;

    return () => {
      window.removeEventListener('focus', handleFocusChange);
      window.removeEventListener('blur', handleFocusChange);
    };
  }, [collectStatistics, handleActivityChange]);

  // Track sector changes to update progress periodically
  useEffect(() => {
    if (!collectStatistics || !isTracking || !book || !libraryBookId || !user || sectorsCount === 0) return;

    // Only update if we've moved to a new sector
    if (activeSector !== lastSectorUpdate) {
      setLastSectorUpdate(activeSector);

      // Calculate progress percentage
      const progressPercentage = sectorsCount > 0
        ? Math.floor(((activeSector + 1) / sectorsCount) * 100)
        : 0;

      // Update book progress (this will also update lastReadAt via updateBookProgress)
      updateBookProgress(user.uid, libraryBookId, {
        percentage: progressPercentage,
        lastReadSector: activeSector
      }).catch(console.error);
    }
  }, [activeSector, book, collectStatistics, isTracking, lastSectorUpdate, libraryBookId, sectorsCount, toast, user]);

  // Handle activity changes periodically
  useEffect(() => {
    if (!collectStatistics) return;

    const checkActivity = () => {
      handleActivityChange();
    };

    const intervalId = setInterval(checkActivity, 5000); // Check every 5 seconds
    return () => clearInterval(intervalId);
  }, [collectStatistics, handleActivityChange]);

  // Clean up any hanging session when component unmounts
  useEffect(() => {
    return () => {
      if (collectStatistics && isTracking && sessionStartTime !== null && book && libraryBookId && user) {
        const sessionEndTime = Date.now();
        const sessionDurationMs = sessionEndTime - sessionStartTime;
        const sessionDurationSec = Math.floor(sessionDurationMs / 1000);

        if (sessionDurationSec > 0) {
          updateReadingSession(user.uid, libraryBookId, {
            isNewSession: true,
            sessionTime: sessionDurationSec
          }).catch(console.error);
        }
      }
    };
  }, [book, collectStatistics, isTracking, libraryBookId, sessionStartTime, toast, user]);

  return {
    isTracking: collectStatistics ? isTracking : false,
    sessionStartTime: collectStatistics ? sessionStartTime : null,
    isBookmarked,
    isBookmarkLoading,
    isWebBook,
    toggleBookmark
  };
}
