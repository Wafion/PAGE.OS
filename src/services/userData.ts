
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, deleteDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import type { SearchResult } from '@/adapters/sourceManager';

// We need a consistent way to generate a unique ID for a book based on its source and ID.
export const generateBookId = (book: Pick<SearchResult, 'source' | 'id'>) => `${book.source}_${book.id.replace(/[\.\/]/g, '_')}`;

// In Firestore, we'll store a simplified version of the book data.
export type LibraryBook = {
  id: string; // The generated unique ID
  savedAt: string;
  progress?: number; // Overall percentage
  lastReadSector?: number; // Index of last read "sector"
  source: "gutendex" | "web";
  title: string;
  authors: string;
  formats: Record<string, string>;
};

/**
 * Adds a book to the user's library (bookmarks).
 */
export async function addBookToLibrary(userId: string, book: SearchResult): Promise<void> {
  const bookId = generateBookId(book);
  const userLibraryRef = doc(db, 'users', userId, 'library', bookId);
  // Re-shaping the book object to ensure consistency in Firestore
  const bookData: LibraryBook = {
    ...book,
    id: book.id, // Keep original ID from source
    source: book.source,
    savedAt: new Date().toISOString(),
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
  });
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
