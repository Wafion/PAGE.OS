
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CommandSearch } from "@/components/command-search";
import type { SearchResult } from "@/adapters/sourceManager";
import { SearchResultCard } from "@/components/search-result-card";
import { BookOpen, ChevronRight, LoaderCircle, Search, SignalZero, Sparkles } from "lucide-react";
import { fetchGutenbergBooks, getFallbackGutenbergBooks } from "@/adapters/gutendex";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WebFallbackResults, type WebFallbackResult } from "@/components/web-fallback-results";
import { useReaderSettings } from "@/context/reader-settings-provider";

const shuffleArray = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

function getBookCover(book: SearchResult) {
  if (book.source === "gutendex") {
    return `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.cover.medium.jpg`;
  }

  return "";
}

const LOUNGE_GENRES = [
  {
    key: "popular",
    label: "Popular",
    eyebrow: "Because readers love classics",
    heading: "Recommendations",
    query: "",
  },
  {
    key: "science-fiction",
    label: "Science fiction",
    eyebrow: "Speculative shelves",
    heading: "Science fiction picks",
    query: "science fiction",
  },
  {
    key: "mystery",
    label: "Mystery",
    eyebrow: "Detectives and secrets",
    heading: "Mystery picks",
    query: "mystery",
  },
  {
    key: "romance",
    label: "Romance",
    eyebrow: "Slow burns and classics",
    heading: "Romance picks",
    query: "romance",
  },
  {
    key: "adventure",
    label: "Adventure",
    eyebrow: "Journeys and high stakes",
    heading: "Adventure picks",
    query: "adventure",
  },
] as const;

type LoungeGenre = (typeof LOUNGE_GENRES)[number];

export default function HomePage() {
  const { uiMode } = useReaderSettings();
  const [primaryResults, setPrimaryResults] = useState<SearchResult[]>([]);
  const [webResults, setWebResults] = useState<WebFallbackResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [featuredBooks, setFeaturedBooks] = useState<SearchResult[]>([]);
  const [isFeaturedLoading, setIsFeaturedLoading] = useState(true);
  const [featuredSourceLabel, setFeaturedSourceLabel] = useState("live network");
  const [primaryStatusMessage, setPrimaryStatusMessage] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<LoungeGenre>(LOUNGE_GENRES[0]);
  const [genreBooks, setGenreBooks] = useState<SearchResult[]>([]);
  const [isGenreLoading, setIsGenreLoading] = useState(false);
  const [genreSourceLabel, setGenreSourceLabel] = useState("Project Gutenberg");

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

  useEffect(() => {
    if (!selectedGenre.query) {
      return;
    }

    let isCancelled = false;

    async function loadGenreBooks() {
      setIsGenreLoading(true);
      setGenreSourceLabel("Project Gutenberg");

      try {
        const gutenbergBooks = await fetchGutenbergBooks(selectedGenre.query);
        const fallbackBooks = getFallbackGutenbergBooks(selectedGenre.query);
        const resolvedBooks = gutenbergBooks.length > 0 ? gutenbergBooks : fallbackBooks;

        if (!isCancelled) {
          setGenreBooks(resolvedBooks.slice(0, 12));
          setGenreSourceLabel(
            gutenbergBooks.length > 0 ? "Project Gutenberg" : "curated fallback shelf",
          );
        }
      } catch (error) {
        console.error(`Failed to load ${selectedGenre.label} books:`, error);

        if (!isCancelled) {
          setGenreBooks(getFallbackGutenbergBooks(selectedGenre.query).slice(0, 12));
          setGenreSourceLabel("curated fallback shelf");
        }
      } finally {
        if (!isCancelled) {
          setIsGenreLoading(false);
        }
      }
    }

    loadGenreBooks();

    return () => {
      isCancelled = true;
    };
  }, [selectedGenre]);

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

  const handleGenreSelect = (genre: LoungeGenre) => {
    setSelectedGenre(genre);
    setHasSearched(false);
    setPrimaryResults([]);
    setWebResults([]);
    setPrimaryStatusMessage("");
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
                {uiMode === "lounge" ? "No Library Results" : "NO_PRIMARY_RESULTS"}
              </CardTitle>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                {primaryStatusMessage ||
                  (uiMode === "lounge"
                    ? "No Gutenberg books matched that search. Web PDF results may still appear below."
                    : "No data streams in the primary network match the provided signature.")}
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
              {uiMode === "lounge" ? "Library Results" : "// PRIMARY_ARCHIVE_RESULTS"}
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
          {uiMode === "lounge"
            ? `Recommended Books (${featuredSourceLabel})`
            : `// FEATURED_LOGS from the ${featuredSourceLabel}`}
        </h2>
        {isFeaturedLoading ? (
          <div className="flex justify-center items-center p-8">
            <LoaderCircle className="h-8 w-8 animate-spin text-accent" />
            <p className="ml-4 text-muted-foreground">
              {uiMode === "lounge" ? "Loading book recommendations..." : "Loading recommendations..."}
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

  const renderLoungeShelf = (books: SearchResult[]) => (
    <div className="library-horizontal-scroll">
      {books.map((book, index) => (
        <SearchResultCard
          key={`${book.source}-${book.id}-${index}`}
          book={book}
          variant="simple"
        />
      ))}
    </div>
  );

  if (uiMode === "lounge") {
    const activeRecommendationBooks =
      selectedGenre.key === "popular" ? featuredBooks.slice(0, 8) : genreBooks.slice(0, 8);
    const recommendationBooks = hasSearched ? primaryResults : activeRecommendationBooks;
    const spotlightBook = activeRecommendationBooks[0] ?? featuredBooks[0] ?? getFallbackGutenbergBooks()[0];
    const shelfBooks =
      selectedGenre.key === "popular" ? featuredBooks.slice(2, 10) : genreBooks.slice(0, 10);
    const isRecommendationLoading =
      selectedGenre.key === "popular" ? isFeaturedLoading : isGenreLoading;
    const recommendationSourceLabel =
      selectedGenre.key === "popular" ? featuredSourceLabel : genreSourceLabel;

    return (
      <div className="library-page">
        <section className="library-hero">
          <div className="library-hero-copy">
            <p className="library-kicker">PAGE.OS</p>
            <h1>Escape into a world of words</h1>
            <p>
              Discover classics, web PDFs, and public-domain gems in a calmer
              reading space built for browsing first.
            </p>
            <div className="library-actions">
              <a href="#recommendations" className="library-primary-action">
                Start Reading <ChevronRight className="h-4 w-4" />
              </a>
              <a href="#search" className="library-secondary-action">
                Search Library
              </a>
            </div>
          </div>

          <div className="library-orbit" aria-hidden="true">
            {featuredBooks.slice(0, 7).map((book, index) => (
              <div
                key={`${book.id}-${index}`}
                className={`library-orbit-book orbit-${index + 1}`}
                style={
                  getBookCover(book)
                    ? { backgroundImage: `url(${getBookCover(book)})` }
                    : undefined
                }
              />
            ))}
            <div className="library-orbit-title">
              <span>Find your next read</span>
            </div>
          </div>
        </section>

        <section id="search" className="library-search-card">
          <div>
            <h2>What do you want to read?</h2>
            <p>Search by title, author, genre, topic, or PDF query.</p>
          </div>
          <CommandSearch onSearch={handleSearch} />
        </section>

        <div className="library-tabs" aria-label="Book categories">
          {LOUNGE_GENRES.map((genre) => (
            <button
              key={genre.key}
              className={selectedGenre.key === genre.key ? "active" : ""}
              type="button"
              aria-pressed={selectedGenre.key === genre.key}
              onClick={() => handleGenreSelect(genre)}
            >
              {genre.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="library-loading">
            <LoaderCircle className="h-6 w-6 animate-spin" />
            <span>Finding books for you...</span>
          </div>
        ) : (
          <>
            {hasSearched ? (
              <section id="recommendations" className="library-section">
                <div className="library-section-heading">
                  <div>
                    <p className="library-kicker">Search results</p>
                    <h2>Books we found</h2>
                  </div>
                  <Search className="h-5 w-5 text-accent" />
                </div>
                {recommendationBooks.length > 0 ? (
                  renderLoungeShelf(recommendationBooks)
                ) : (
                  <Card className="library-empty-card">
                    <CardContent className="p-6 text-center">
                      <SignalZero className="mx-auto h-8 w-8 text-accent" />
                      <h3 className="mt-3 font-semibold">No Gutenberg matches</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Brave PDF/web results may still be available below.
                      </p>
                    </CardContent>
                  </Card>
                )}
                <WebFallbackResults results={webResults} />
              </section>
            ) : (
              <>
                <section id="recommendations" className="library-section">
                  <div className="library-section-heading">
                    <div>
                      <p className="library-kicker">
                        {selectedGenre.eyebrow} / {recommendationSourceLabel}
                      </p>
                      <h2>{selectedGenre.heading}</h2>
                    </div>
                    <Sparkles className="h-5 w-5 text-accent" />
                  </div>

                  {isRecommendationLoading ? (
                    <div className="library-loading">
                      <LoaderCircle className="h-6 w-6 animate-spin" />
                      <span>Curating {selectedGenre.label.toLowerCase()} recommendations...</span>
                    </div>
                  ) : spotlightBook ? (
                    <div className="library-spotlight">
                      <div
                        className="library-spotlight-cover"
                        style={
                          getBookCover(spotlightBook)
                            ? { backgroundImage: `url(${getBookCover(spotlightBook)})` }
                            : undefined
                        }
                      />
                      <div>
                        <h3>{spotlightBook.title}</h3>
                        <p>by {spotlightBook.authors || "Unknown author"}</p>
                        <div className="library-rating">4.6 reader score</div>
                        <Link
                          href={`/read?source=${spotlightBook.source}&id=${spotlightBook.id}&title=${encodeURIComponent(spotlightBook.title)}&authors=${encodeURIComponent(spotlightBook.authors)}${spotlightBook.source === "gutendex" ? `&formats=${encodeURIComponent(JSON.stringify(spotlightBook.formats))}` : ""}`}
                          className="library-read-now"
                        >
                          Start reading
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <Card className="library-empty-card">
                      <CardContent className="p-6 text-center">
                        <SignalZero className="mx-auto h-8 w-8 text-accent" />
                        <h3 className="mt-3 font-semibold">No books found for this shelf</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Try another genre or search for a specific topic.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </section>

                <section className="library-section">
                  <div className="library-section-heading">
                    <div>
                      <p className="library-kicker">Browse the selected shelf</p>
                      <h2>{selectedGenre.label} shelf</h2>
                    </div>
                    <BookOpen className="h-5 w-5 text-accent" />
                  </div>
                  {isRecommendationLoading ? (
                    <div className="library-loading">
                      <LoaderCircle className="h-6 w-6 animate-spin" />
                      <span>Curating recommendations...</span>
                    </div>
                  ) : shelfBooks.length > 0 ? (
                    renderLoungeShelf(shelfBooks)
                  ) : (
                    <Card className="library-empty-card">
                      <CardContent className="p-6 text-center">
                        <SignalZero className="mx-auto h-8 w-8 text-accent" />
                        <h3 className="mt-3 font-semibold">This shelf is still being built</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Gutenberg may be busy. Search is still available above.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-headline text-accent">
          SYSTEM_FEED
        </h1>
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

