"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Library, LoaderCircle, User, Sparkles } from "lucide-react";
import { useAuth } from "@/context/auth-provider";
import { useReaderSettings } from "@/context/reader-settings-provider";
import { getLibraryBooks, LibraryBook } from "@/services/userData";
import { SearchResultCard } from "@/components/search-result-card";
import { MotionLibrary } from "@/components/library/motion-library";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function LibraryContent() {
  const { uiMode, setUiMode } = useReaderSettings();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");

  useEffect(() => {
    if (modeParam === "motion" && uiMode !== "motion") {
      setUiMode("motion");
    }
  }, [modeParam, uiMode, setUiMode]);

  const { user } = useAuth();
  const [libraryBooks, setLibraryBooks] = useState<LibraryBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // If in Motion UI mode, render the reference-accurate bookshelf
  if (uiMode === "motion" || modeParam === "motion") {
    return <MotionLibrary />;
  }

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const { auth, googleProvider } = await import("@/lib/firebase");
      const { signInWithPopup, setPersistence, browserLocalPersistence } = await import("firebase/auth");
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (
        error?.code !== "auth/popup-closed-by-user" &&
        error?.code !== "auth/cancelled-popup-request"
      ) {
        console.error("Error signing in with Google:", error);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      getLibraryBooks(user.uid)
        .then(setLibraryBooks)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
      setLibraryBooks([]);
    }
  }, [user]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center text-center p-8">
            <LoaderCircle className="h-8 w-8 animate-spin text-accent" />
            <p className="text-muted-foreground mt-4">Accessing archive records...</p>
        </div>
      );
    }

    if (!user) {
        return (
             <Card className="border-border/50 bg-card text-center max-w-lg mx-auto">
                <CardHeader>
                    <div className="mx-auto bg-input rounded-full p-3 w-fit">
                        <User className="h-8 w-8 text-accent" />
                    </div>
                </CardHeader>
                <CardContent>
                <CardTitle className="font-headline text-lg text-accent/80">SIGN IN TO SAVE YOUR READINGS</CardTitle>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm">
                    You must be logged in to view and save your readings. Sign in to track your reading progress and keep your library synchronized across all your devices.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Button
                      type="button"
                      disabled={isSigningIn}
                      onClick={handleSignIn}
                      className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      {isSigningIn ? (
                        <>
                          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <span>Sign in with Google</span>
                      )}
                    </Button>
                    <Button asChild variant="outline" className="w-full sm:w-auto border-accent/50 text-accent hover:bg-accent/10 hover:text-accent">
                        <Link href="/profile">Go to Profile</Link>
                    </Button>
                </div>
                </CardContent>
            </Card>
        )
    }

    if (libraryBooks.length === 0) {
      return (
        <Card className="border-border/50 bg-card text-center">
            <CardHeader>
                <div className="mx-auto bg-input rounded-full p-3 w-fit">
                <Library className="h-8 w-8 text-accent" />
                </div>
            </CardHeader>
            <CardContent>
            <CardTitle className="font-headline text-lg text-accent/80">ARCHIVE IS EMPTY</CardTitle>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Search for transmissions and save them to your archive for offline access.
            </p>
            </CardContent>
        </Card>
      );
    }
    
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {libraryBooks.map((book) => (
                <SearchResultCard key={`${book.source || "book"}-${book.id}`} book={book as any} />
            ))}
        </div>
    )
  };

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 animate-fade-in">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline text-accent">ARCHIVE_DIRECTORY</h1>
          <p className="text-muted-foreground">
            Your personal collection of synchronized memory logs.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setUiMode("motion")}
          className="border-accent/40 text-accent hover:bg-accent/10 flex items-center gap-2 self-start sm:self-auto"
        >
          <Sparkles className="h-4 w-4" />
          <span>Switch to Motion Bookshelf</span>
        </Button>
      </header>
      {renderContent()}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground font-mono">Initializing Library...</div>}>
      <LibraryContent />
    </Suspense>
  );
}
