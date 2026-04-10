"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Library, LoaderCircle, User } from "lucide-react";
import { useAuth } from "@/context/auth-provider";
import { getLibraryBooks, LibraryBook } from "@/services/userData";
import { SearchResultCard } from "@/components/search-result-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LibraryPage() {
  const { user } = useAuth();
  const [libraryBooks, setLibraryBooks] = useState<LibraryBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
             <Card className="border-border/50 bg-card text-center">
                <CardHeader>
                    <div className="mx-auto bg-input rounded-full p-3 w-fit">
                        <User className="h-8 w-8 text-accent" />
                    </div>
                </CardHeader>
                <CardContent>
                <CardTitle className="font-headline text-lg text-accent/80">AUTHENTICATION REQUIRED</CardTitle>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    Please log in to your profile to view your archived transmissions.
                </p>
                <Button asChild variant="outline" className="mt-4 border-accent/50 text-accent hover:bg-accent/10 hover:text-accent">
                    <Link href="/profile">Go to Profile</Link>
                </Button>
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
            {libraryBooks
                .filter((book) => book.source === "gutendex" || book.source === "web")
                .map((book) => (
                    <SearchResultCard key={`${book.source}-${book.id}`} book={book as any} />
                ))}
        </div>
    )
  };

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-headline text-accent">ARCHIVE_DIRECTORY</h1>
        <p className="text-muted-foreground">
          Your personal collection of synchronized memory logs.
        </p>
      </header>
      {renderContent()}
    </div>
  );
}
