
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, deleteDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import type { SearchResult } from '@/adapters/sourceManager';

// We need a consistent way to generate a unique ID for a book based on its source and ID.
export const generateBookId = (book: Pick<SearchResult, 'source' | 'id'>) => `${book.source}_${book.id.replace(/[\.\/]/g, '_')}`;

// In Firestore, we'll store a simplified version of the book data.
export type LibraryBook = {
  id: string; // The generated unique ID
  savedAt: string;
  firstReadAt?: string; // Timestamp when user first started reading the book
  lastReadAt?: string; // Timestamp of most recent reading session
  totalReadingSessions?: number; // Count of distinct reading sessions
  totalTimeSpent?: number; // Cumulative time spent reading (in seconds)
  progress?: number; // Overall percentage
  lastReadSector?: number; // Index of last read "sector"
  source: "gutendex" | "web";
  title: string;
  authors: string;
  formats: Record<string, string>;
  subjects?: string[];
};

/**
 * Adds a book to the user's library (bookmarks).
 */
export async function addBookToLibrary(userId: string, book: SearchResult): Promise<void> {
  const bookId = generateBookId(book);
  const userLibraryRef = doc(db, 'users', userId, 'library', bookId);
  const now = new Date().toISOString();
  // Re-shaping the book object to ensure consistency in Firestore
  const bookData: LibraryBook = {
    ...book,
    id: book.id, // Keep original ID from source
    source: book.source,
    savedAt: now,
    firstReadAt: now,
    lastReadAt: now,
    totalReadingSessions: 0,
    totalTimeSpent: 0,
    progress: 0,
    lastReadSector: 0,
    formats: book.formats ?? {},
  };
  await setDoc(userLibraryRef, bookData);
}

/**
 * Removes a book from the user's library.
 */
export async function removeBookFromLibrary(userId: string, bookId: string): Promise<void> {
    const bookRef = doc(db, 'users', userId, 'library', bookId);
    await deleteDoc(bookRef);
}

/**
 * Fetches a single book from the user's library.
 */
export async function getLibraryBook(userId: string, bookId: string): Promise<LibraryBook | null> {
    const bookRef = doc(db, 'users', userId, 'library', bookId);
    const docSnap = await getDoc(bookRef);
    if (docSnap.exists()) {
        return docSnap.data() as LibraryBook;
    }
    return null;
}

/**
 * Updates the reading progress for a book in the user's library.
 */
export async function updateBookProgress(userId: string, bookId: string, progress: { percentage: number; lastReadSector: number }): Promise<void> {
  const { percentage, lastReadSector } = progress;
  if (percentage < 0 || percentage > 100) {
    console.warn("Progress percentage must be between 0 and 100.");
    return;
  }
  const bookRef = doc(db, 'users', userId, 'library', bookId);
  // Use updateDoc to avoid overwriting the whole document
  await updateDoc(bookRef, {
      progress: percentage,
      lastReadSector: lastReadSector,
      lastReadAt: new Date().toISOString(),
  });
}

/**
 * Updates reading session statistics for a book.
 * Should be called when a reading session starts or ends.
 */
export async function updateReadingSession(userId: string, bookId: string, sessionData: {
  isNewSession?: boolean;
  sessionTime?: number; // time spent in this session in seconds
}): Promise<void> {
  const bookRef = doc(db, 'users', userId, 'library', bookId);

  // First get the current book data
  const bookSnap = await getDoc(bookRef);
  if (!bookSnap.exists()) {
    console.warn("Book not found in library");
    return;
  }

  const bookData = bookSnap.data() as LibraryBook;
  const now = new Date().toISOString();

  // Prepare update data
  const updateData: Partial<LibraryBook> = {
    lastReadAt: now,
  };

  // If this is a new session, increment the session counter
  if (sessionData.isNewSession) {
    updateData.totalReadingSessions = (bookData.totalReadingSessions || 0) + 1;
  }

  // Add session time to total time spent
  if (sessionData.sessionTime !== undefined) {
    updateData.totalTimeSpent = (bookData.totalTimeSpent || 0) + sessionData.sessionTime;
  }

  // If this is the first time reading, set firstReadAt
  if (!(bookData.firstReadAt)) {
    updateData.firstReadAt = now;
  }

  await updateDoc(bookRef, updateData);
}


/**
 * Fetches all books from the user's library.
 */
export async function getLibraryBooks(userId: string): Promise<LibraryBook[]> {
  const libraryCollectionRef = collection(db, 'users', userId, 'library');
  const snapshot = await getDocs(libraryCollectionRef);
  if (snapshot.empty) {
    return [];
  }
  return snapshot.docs.map(doc => doc.data() as LibraryBook).sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
}

/**
 * Fetches user statistics from Firestore
 */
export async function getUserStatistics(userId: string): Promise<UserStatistics | null> {
  const statsRef = doc(db, 'users', userId, 'statistics', 'overview');
  const statsSnap = await getDoc(statsRef);
  if (statsSnap.exists()) {
    return statsSnap.data() as UserStatistics;
  }
  return null;
}

/**
 * Creates or updates user statistics in Firestore
 */
export async function updateUserStatistics(userId: string, statistics: Partial<UserStatistics>): Promise<void> {
  const statsRef = doc(db, 'users', userId, 'statistics', 'overview');
  const updateData = {
    ...statistics,
    lastUpdated: new Date().toISOString(),
    uid: userId,
  };
  await setDoc(statsRef, updateData, { merge: true });
}

/**
 * Calculates user statistics from library books
 * This should be called periodically to update the aggregated statistics
 */
export async function calculateAndUpdateUserStatistics(userId: string): Promise<void> {
  try {
    // Get all library books
    const books = await getLibraryBooks(userId);

    // Get existing statistics to preserve streak data etc.
    const existingStats = await getUserStatistics(userId) || {
      uid: userId,
      readingStreak: 0,
      longestStreak: 0,
      booksCompleted: 0,
      totalBooksInLibrary: 0,
      totalTimeSpentReading: 0,
      averageSessionLength: 0,
      booksByGenre: {},
      lastUpdated: new Date().toISOString(),
      readingCalendar: {}
    };

    // Calculate new statistics
    const totalBooksInLibrary = books.length;
    const booksCompleted = books.filter(book => book.progress === 100).length;
    const totalTimeSpentReading = books.reduce((sum, book) => sum + (book.totalTimeSpent || 0), 0);

    // Calculate average session length
    const totalSessions = books.reduce((sum, book) => sum + (book.totalReadingSessions || 0), 0);
    const averageSessionLength = totalSessions > 0 ? totalTimeSpentReading / totalSessions : 0;

    // Calculate books by genre
    const booksByGenre: Record<string, number> = {};
    books.forEach(book => {
      if (book.subjects && Array.isArray(book.subjects)) {
        book.subjects.forEach(subject => {
          if (subject) {
            booksByGenre[subject] = (booksByGenre[subject] || 0) + 1;
          }
        });
      }
    });

    // For reading streak and calendar, we need more sophisticated logic
    // For now, we'll preserve existing values and update them via separate logic
    // In a full implementation, we would analyze reading sessions over time

    const updatedStatistics: Partial<UserStatistics> = {
      booksCompleted,
      totalBooksInLibrary,
      totalTimeSpentReading,
      averageSessionLength,
      booksByGenre,
      // Preserve existing streak and calendar data - these would be updated separately
      readingStreak: existingStats.readingStreak,
      longestStreak: existingStats.longestStreak,
      readingCalendar: existingStats.readingCalendar
    };

    await updateUserStatistics(userId, updatedStatistics);
  } catch (error) {
    console.error("Error calculating user statistics:", error);
  }
}

/**
 * User statistics for reading analytics
 */
export type UserStatistics = {
  uid: string;
  readingStreak: number; // Current consecutive days reading
  longestStreak: number; // Maximum consecutive days reading achieved
  booksCompleted: number; // Count of books with 100% progress
  totalBooksInLibrary: number; // Total books saved to library
  totalTimeSpentReading: number; // Lifetime reading time (seconds)
  averageSessionLength: number; // Average time per reading session (seconds)
  booksByGenre: Record<string, number>; // Distribution of books by subject/genre
  lastUpdated: string; // Timestamp of last statistics update
  readingCalendar: Record<string, number>; // Map of dates (YYYY-MM-DD) to reading time in seconds for that day
};
