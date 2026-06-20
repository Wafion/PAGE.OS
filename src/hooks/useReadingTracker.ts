'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { SearchResult } from '@/adapters/sourceManager';
import { updateBookProgress, updateReadingSession } from '@/services/userData';
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

  // If statistics collection is disabled, return early with tracking disabled
  if (!collectStatistics) {
    return {
      isTracking: false,
      sessionStartTime: null,
      isBookmarked,
      isBookmarkLoading,
      isWebBook,
      toggleBookmark
    };
  }

  const [isTracking, setIsTracking] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [lastSectorUpdate, setLastSectorUpdate] = useState<number>(-1);
  const visibilityRef = useRef<boolean>(false);
  const focusRef = useRef<boolean>(false);

  // Determine if the reader is active (visible and focused)
  const isReaderActive = useCallback(() => {
    return visibilityRef.current && focusRef.current;
  }, []);

  // Update visibility when window visibility changes
  useEffect(() => {
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
  }, []);

  // Update focus when window focus changes
  useEffect(() => {
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

      if (sessionDurationSec > 0 && book && user) {
        try {
          // Update reading session statistics
          await updateReadingSession(user.uid, book.id, {
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
  }, [book, isBookmarked, isTracking, isReaderActive, sessionStartTime, toggleBookmark, toast, user]);

  // Track sector changes to update progress periodically
  useEffect(() => {
    if (!isTracking || !book || !user || sectorsCount === 0) return;

    // Only update if we've moved to a new sector
    if (activeSector !== lastSectorUpdate) {
      setLastSectorUpdate(activeSector);

      // Calculate progress percentage
      const progressPercentage = sectorsCount > 0
        ? Math.floor(((activeSector + 1) / sectorsCount) * 100)
        : 0;

      // Update book progress (this will also update lastReadAt via updateBookProgress)
      updateBookProgress(user.uid, book.id, {
        percentage: progressPercentage,
        lastReadSector: activeSector
      }).catch(console.error);
    }
  }, [activeSector, book, isTracking, lastSectorUpdate, sectorsCount, toast, user]);

  // Handle activity changes periodically
  useEffect(() => {
    const checkActivity = () => {
      handleActivityChange();
    };

    const intervalId = setInterval(checkActivity, 5000); // Check every 5 seconds
    return () => clearInterval(intervalId);
  }, [handleActivityChange]);

  // Clean up any hanging session when component unmounts
  useEffect(() => {
    return () => {
      if (isTracking && sessionStartTime !== null && book && user) {
        const sessionEndTime = Date.now();
        const sessionDurationMs = sessionEndTime - sessionStartTime;
        const sessionDurationSec = Math.floor(sessionDurationMs / 1000);

        if (sessionDurationSec > 0) {
          updateReadingSession(user.uid, book.id, {
            isNewSession: true,
            sessionTime: sessionDurationSec
          }).catch(console.error);
        }
      }
    };
  }, [book, isTracking, sessionStartTime, toast, user]);

  return {
    isTracking,
    sessionStartTime,
    isBookmarked,
    isBookmarkLoading,
    isWebBook,
    toggleBookmark
  };
}