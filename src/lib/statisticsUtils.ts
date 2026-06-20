/**
 * Utility functions for calculating reading statistics
 */

/**
 * Calculate reading streak from a calendar of daily reading times
 * @param readingCalendar Map of dates (YYYY-MM-DD) to reading time in seconds
 * @returns Object with currentStreak and longestStreak
 */
export function calculateReadingStreak(
  readingCalendar: Record<string, number>
): { currentStreak: number; longestStreak: number } {
  if (Object.keys(readingCalendar).length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Sort dates ascending
  const sortedDates = Object.keys(readingCalendar).sort();

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Check each date to see if it's consecutive
  for (let i = 0; i < sortedDates.length; i++) {
    const date = sortedDates[i];
    const prevDate = i > 0 ? sortedDates[i - 1] : null;

    // Convert dates to Date objects to calculate difference
    const currentDate = new Date(date);
    const prevDateObj = prevDate ? new Date(prevDate) : null;

    // Check if this date has reading time (> 0 seconds)
    const hasReading = readingCalendar[date] > 0;

    if (hasReading) {
      // If it's the first date or consecutive to previous date
      if (!prevDateObj ||
          (currentDate.getTime() - prevDateObj.getTime()) === (24 * 60 * 60 * 1000)) {
        tempStreak++;
      } else {
        // Streak broken, reset temp streak
        tempStreak = 1; // Start new streak with current day
      }

      // Update longest streak
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else {
      // No reading on this day, reset streak
      tempStreak = 0;
    }
  }

  // Calculate current streak (from today backwards)
  // Check if today has reading
  if (readingCalendar[today] && readingCalendar[today] > 0) {
    currentStreak = 1;
    // Check backwards from yesterday
    let checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - 1); // Yesterday

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (readingCalendar[dateStr] && readingCalendar[dateStr] > 0) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  } else {
    currentStreak = 0;
  }

  return { currentStreak, longestStreak };
}

/**
 * Calculate average session length from books data
 * @param books Array of LibraryBook objects
 * @returns Average session length in seconds
 */
export function calculateAverageSessionLength(books: any[]): number {
  const totalTimeSpent = books.reduce((sum, book) =>
    sum + (book.totalTimeSpent || 0), 0);

  const totalSessions = books.reduce((sum, book) =>
    sum + (book.totalReadingSessions || 0), 0);

  return totalSessions > 0 ? totalTimeSpent / totalSessions : 0;
}

/**
 * Calculate books completed count
 * @param books Array of LibraryBook objects
 * @returns Number of books with 100% progress
 */
export function calculateBooksCompleted(books: any[]): number {
  return books.filter(book => book.progress === 100).length;
}

/**
 * Generate genre distribution from books data
 * @param books Array of LibraryBook objects
 * @returns Record of genre names to counts
 */
export function calculateBooksByGenre(books: any[]): Record<string, number> {
  const genreCounts: Record<string, number> = {};

  books.forEach(book => {
    if (book.subjects && Array.isArray(book.subjects)) {
      book.subjects.forEach((subject: string) => {
        if (subject) {
          genreCounts[subject] = (genreCounts[subject] || 0) + 1;
        }
      });
    }
  });

  return genreCounts;
}

/**
 * Format seconds into a human-readable time string
 * @param seconds Time in seconds
 * @returns Formatted string (e.g., "2h 15m", "45m", "90s")
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Add or update reading time for a specific date
 * @param readingCalendar Current reading calendar
 * @param dateString Date in YYYY-MM-DD format
 * @param secondsToAdd Seconds to add to this date
 * @returns Updated reading calendar
 */
export function addReadingTimeToCalendar(
  readingCalendar: Record<string, number>,
  dateString: string,
  secondsToAdd: number
): Record<string, number> {
  const updatedCalendar = { ...readingCalendar };
  updatedCalendar[dateString] = (updatedCalendar[dateString] || 0) + secondsToAdd;
  return updatedCalendar;
}