
"use client";

import { useState, useEffect } from "react";
import { CommandSearch } from "@/components/command-search";
import type { SearchResult } from "@/adapters/sourceManager";
import { SearchResultCard } from "@/components/search-result-card";
import { LoaderCircle, SignalZero } from "lucide-react";
import { fetchGutenbergBooks, getFallbackGutenbergBooks } from "@/adapters/gutendex";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WebFallbackResults, type WebFallbackResult } from "@/components/web-fallback-results";

const shuffleArray = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export default function HomePage() {
  const [primaryResults, setPrimaryResults] = useState<SearchResult[]>([]);
  const [webResults, setWebResults] = useState<WebFallbackResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [featuredBooks, setFeaturedBooks] = useState<SearchResult[]>([]);
  const [isFeaturedLoading, setIsFeaturedLoading] = useState(true);
  const [featuredSourceLabel, setFeaturedSourceLabel] = useState("live network");
  const [primaryStatusMessage, setPrimaryStatusMessage] = useState("");

  useEffect(() => {
    async function loadFeaturedBooks() {
      setIsFeaturedLoading(true);
      try {
        const gutenbergBooks = await fetchGutenbergBooks();
        const featured = gutenbergBooks.length > 0 ? gutenbergBooks : getFallbackGutenbergBooks();
        setFeaturedBooks(shuffleArray(featured.slice(0, 20)));
        setFeaturedSourceLabel(
          gutenbergBooks.length > 0 ? "live network" : "fallback archive",
        );
      } catch (error) {
        console.error("Failed to load featured books:", error);
        setFeaturedBooks(shuffleArray(getFallbackGutenbergBooks().slice(0, 20)));
        setFeaturedSourceLabel("fallback archive");
      } finally {
        setIsFeaturedLoading(false);
      }
    }
    loadFeaturedBooks();
  }, []);

  const handleSearch = async (query: string) => {
    if (!query) {
      setPrimaryResults([]);
      setWebResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const webSearchPromise = fetch(`/api/brave-search?q=${encodeURIComponent(query)}`).then(res => res.json());
      const gutenbergPromise = fetchGutenbergBooks(query);

      const [webData, gutenbergData] = await Promise.allSettled([webSearchPromise, gutenbergPromise]);
      
      if (webData.status === 'fulfilled' && !webData.value.error) {
        setWebResults(webData.value || []);
      } else {
        console.error("Web search failed:", webData.status === 'rejected' ? webData.reason : webData.value.error);
        setWebResults([]);
      }
      
      if (gutenbergData.status === 'fulfilled') {
        setPrimaryResults(gutenbergData.value || []);
        setPrimaryStatusMessage(
          gutenbergData.value?.length
            ? ""
            : "Primary archive is degraded right now, showing fallback classics when available.",
        );
      } else {
        console.error("Gutenberg search failed:", gutenbergData.reason);
        setPrimaryResults([]);
        setPrimaryStatusMessage(
          "Primary archive is currently unavailable. Web scraping is still online.",
        );
      }

    } catch (error) {
      console.error("An error occurred during search:", error);
      setPrimaryResults([]);
      setWebResults([]);
      setPrimaryStatusMessage(
        "Primary archive is currently unavailable. Web scraping is still online.",
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderPrimaryResults = () => {
    if (primaryResults.length === 0) {
       return (
        <Card className="border-border/50 bg-card text-center col-span-full">
            <CardHeader>
              <div className="mx-auto bg-input rounded-full p-3 w-fit">
                <SignalZero className="h-8 w-8 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
            <CardTitle className="font-headline text-lg text-accent/80">
                NO_PRIMARY_RESULTS
              </CardTitle>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                {primaryStatusMessage || "No data streams in the primary network match the provided signature."}
              </p>
            </CardContent>
          </Card>
      );
    }
    return (
      <>
        {primaryResults.map((book, index) => (
          <SearchResultCard
            key={`${book.source}-${book.id}-${index}`}
            book={book}
          />
        ))}
      </>
    );
  };
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center p-8 col-span-full">
          <LoaderCircle className="h-8 w-8 animate-spin text-accent" />
          <p className="ml-4 text-muted-foreground">
            Querying transmission nodes...
          </p>
        </div>
      );
    }
    
    if (hasSearched) {
       return (
        <>
          <section className="col-span-full">
            <h2 className="font-headline text-lg text-accent/80 mb-4 border-b border-dashed border-border pb-2">
              // PRIMARY_ARCHIVE_RESULTS
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {renderPrimaryResults()}
            </div>
          </section>
          <WebFallbackResults results={webResults} />
        </>
      );
    }

    // Default view: Featured books
    return (
      <section className="col-span-full">
        <h2 className="font-headline text-lg text-accent/80 mb-4">
          // FEATURED_LOGS from the {featuredSourceLabel}
        </h2>
        {isFeaturedLoading ? (
          <div className="flex justify-center items-center p-8">
            <LoaderCircle className="h-8 w-8 animate-spin text-accent" />
            <p className="ml-4 text-muted-foreground">
              Loading recommendations...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {featuredBooks.map((book, index) => (
              <SearchResultCard
                key={`${book.source}-${book.id}-${index}`}
                book={book}
              />
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-headline text-accent">SYSTEM_FEED</h1>
        <p className="text-muted-foreground">
          Search for transmissions and memory logs across the network.
        </p>
      </div>

      <CommandSearch onSearch={handleSearch} />

      <div className="grid grid-cols-1 gap-8">
        {renderContent()}
      </div>
    </div>
  );
}
