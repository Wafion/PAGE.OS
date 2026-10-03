"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { CommandSearch } from "@/components/command-search";
import { useBookBriefing } from "@/context/book-briefing-provider";
import type { SearchResult } from "@/adapters/sourceManager";
import { SearchResultCard } from "@/components/search-result-card";
import MotionRecommendationShelf from "@/components/home/motion-recommendation-shelf";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Images,
  LoaderCircle,
  Search,
  SignalZero,
  Sparkles,
} from "lucide-react";
import {
  fetchGutenbergBooks,
  getFallbackGutenbergBooks,
} from "@/adapters/gutendex";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  WebFallbackResults,
  type WebFallbackResult,
} from "@/components/web-fallback-results";
import { useReaderSettings } from "@/context/reader-settings-provider";
import type { RecommendationGenreKey } from "@/lib/recommendations";
import { isReferenceWork } from "@/lib/recommendations";

const shuffleArray = <T,>(array: T[]) => {
  for (let i = array.length - 1; i > 0; i -= 1) {
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

const MOTION_HERO_POSTER =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260908_122011_59c97465-4d23-4fdc-ac40-f6832f573e28.png&w=1920&q=85";
const MOTION_HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260908_125738_eb584080-9f98-489e-adb2-014760aa34da.mp4";

type LoungeGenre = (typeof LOUNGE_GENRES)[number];

type RecommendationShelfResponse = {
  books: SearchResult[];
  sourceLabel: string;
};

type CachedRecommendationShelf = RecommendationShelfResponse & {
  cachedAt: number;
};

const RECOMMENDATION_CACHE_PREFIX = "pageos-recommendation-shelf";
const RECOMMENDATION_CACHE_TTL_MS = 1000 * 60 * 60 * 6;

function getRecommendationDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getRecommendationCacheKey(genre: RecommendationGenreKey, limit: number) {
  return `${RECOMMENDATION_CACHE_PREFIX}:${getRecommendationDayKey()}:${genre}:${limit}`;
}

function readCachedRecommendationShelf(
  genre: RecommendationGenreKey,
  limit: number,
): RecommendationShelfResponse | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getRecommendationCacheKey(genre, limit));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CachedRecommendationShelf;
    if (
      !parsed ||
      !Array.isArray(parsed.books) ||
      typeof parsed.sourceLabel !== "string" ||
      typeof parsed.cachedAt !== "number"
    ) {
      return null;
    }

    if (Date.now() - parsed.cachedAt > RECOMMENDATION_CACHE_TTL_MS) {
      window.localStorage.removeItem(getRecommendationCacheKey(genre, limit));
      return null;
    }

    return {
      books: parsed.books,
      sourceLabel: parsed.sourceLabel,
    };
  } catch (error) {
    console.warn("Could not read cached recommendation shelf.", error);
    return null;
  }
}

function writeCachedRecommendationShelf(
  genre: RecommendationGenreKey,
  limit: number,
  shelf: RecommendationShelfResponse,
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const payload: CachedRecommendationShelf = {
      ...shelf,
      cachedAt: Date.now(),
    };

    window.localStorage.setItem(
      getRecommendationCacheKey(genre, limit),
      JSON.stringify(payload),
    );
  } catch (error) {
    console.warn("Could not cache recommendation shelf.", error);
  }
}

async function fetchRecommendationShelf(
  genre: RecommendationGenreKey,
  limit: number,
): Promise<RecommendationShelfResponse> {
  const params = new URLSearchParams({
    genre,
    limit: String(limit),
    day: getRecommendationDayKey(),
  });

  const response = await fetch(`/api/recommendations?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch recommendation shelf: ${response.statusText}`);
  }

  return (await response.json()) as RecommendationShelfResponse;
}

export default function HomePage() {
  const { uiMode } = useReaderSettings();
  const { showBriefing } = useBookBriefing();
  const [primaryResults, setPrimaryResults] = useState<SearchResult[]>([]);
  const [webResults, setWebResults] = useState<WebFallbackResult[]>([]);
  const [webArchiveError, setWebArchiveError] = useState<string | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [featuredBooks, setFeaturedBooks] = useState<SearchResult[]>([]);
  const [isFeaturedLoading, setIsFeaturedLoading] = useState(true);
  const [featuredSourceLabel, setFeaturedSourceLabel] = useState("instant shelf");
  const [primaryStatusMessage, setPrimaryStatusMessage] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<LoungeGenre>(LOUNGE_GENRES[0]);
  const [genreBooks, setGenreBooks] = useState<SearchResult[]>([]);
  const [isGenreLoading, setIsGenreLoading] = useState(false);
  const [genreSourceLabel, setGenreSourceLabel] = useState("instant shelf");
  const orbitVideoRef = useRef<HTMLVideoElement>(null);
  const [orbitGreeting, setOrbitGreeting] = useState("");
  const [loadedShelves, setLoadedShelves] = useState<
    Partial<Record<RecommendationGenreKey, RecommendationShelfResponse>>
  >({});

  useEffect(() => {
    if (uiMode !== "motion") return;

    const greeting = "Glad you stopped in. Good taste tends to find us. Now, what are you looking for?";
    let cursor = 0;
    let interval: number | undefined;
    const timeout = window.setTimeout(() => {
      interval = window.setInterval(() => {
        cursor += 1;
        setOrbitGreeting(greeting.slice(0, cursor));
        if (cursor >= greeting.length && interval) window.clearInterval(interval);
      }, 32);
    }, 600);

    let pointerX = window.innerWidth / 2;
    let frame = 0;
    const scrubVideo = (event: MouseEvent) => {
      pointerX = event.clientX;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const video = orbitVideoRef.current;
        if (video?.duration) {
          video.currentTime = Math.max(0, Math.min(video.duration, (pointerX / window.innerWidth) * video.duration));
        }
        frame = 0;
      });
    };

    window.addEventListener("pointermove", scrubVideo);
    return () => {
      window.clearTimeout(timeout);
      if (interval) window.clearInterval(interval);
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", scrubVideo);
    };
  }, [uiMode]);

  // Auto-scroll to search results when they appear in Motion UI
  useEffect(() => {
    if (uiMode !== "motion") return;
    if (hasSearched && !isLoading) {
      const timer = window.setTimeout(() => {
        const resultsEl = document.getElementById("motion-results");
        if (resultsEl) {
          resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
      return () => window.clearTimeout(timer);
    }
  }, [hasSearched, isLoading, uiMode, lastSearchQuery]);

  useEffect(() => {
    let isCancelled = false;

    async function loadFeaturedBooks() {
      const cachedShelf = readCachedRecommendationShelf("popular", 20);
      if (cachedShelf && !isCancelled) {
        setFeaturedBooks(cachedShelf.books);
        setFeaturedSourceLabel(`${cachedShelf.sourceLabel} / cached`);
        setLoadedShelves((current) =>
          current.popular ? current : { ...current, popular: cachedShelf },
        );
      } else if (!isCancelled) {
        setIsFeaturedLoading(true);
      }

      try {
        const shelf = await fetchRecommendationShelf("popular", 20);
        if (isCancelled) {
          return;
        }

        setFeaturedBooks(shelf.books);
        setFeaturedSourceLabel(shelf.sourceLabel);
        setLoadedShelves((current) => ({ ...current, popular: shelf }));
        writeCachedRecommendationShelf("popular", 20, shelf);
      } catch (error) {
        console.error("Failed to load featured books:", error);
        if (!cachedShelf && !isCancelled) {
          setFeaturedBooks(shuffleArray([...getFallbackGutenbergBooks().slice(0, 12)]));
          setFeaturedSourceLabel("fallback archive");
        }
      } finally {
        if (!isCancelled) {
          setIsFeaturedLoading(false);
        }
      }
    }

    void loadFeaturedBooks();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedGenre.key === "popular") {
      return;
    }

    let isCancelled = false;
    const genreKey = selectedGenre.key as RecommendationGenreKey;

    async function loadGenreBooks() {
      const existingShelf =
        loadedShelves[genreKey] ?? readCachedRecommendationShelf(genreKey, 12);

      if (existingShelf && !isCancelled) {
        setGenreBooks(existingShelf.books);
        setGenreSourceLabel(
          loadedShelves[genreKey]
            ? existingShelf.sourceLabel
            : `${existingShelf.sourceLabel} / cached`,
        );
        setLoadedShelves((current) =>
          current[genreKey] ? current : { ...current, [genreKey]: existingShelf },
        );
      } else if (!isCancelled) {
        setIsGenreLoading(true);
      }

      try {
        const shelf = await fetchRecommendationShelf(genreKey, 12);
        if (isCancelled) {
          return;
        }

        setGenreBooks(shelf.books);
        setGenreSourceLabel(shelf.sourceLabel);
        setLoadedShelves((current) => ({ ...current, [genreKey]: shelf }));
        writeCachedRecommendationShelf(genreKey, 12, shelf);
      } catch (error) {
        console.error(`Failed to load ${selectedGenre.label} books:`, error);
        if (!existingShelf && !isCancelled) {
          setGenreBooks(getFallbackGutenbergBooks(selectedGenre.query).slice(0, 12));
          setGenreSourceLabel("curated fallback shelf");
        }
      } finally {
        if (!isCancelled) {
          setIsGenreLoading(false);
        }
      }
    }

    void loadGenreBooks();

    return () => {
      isCancelled = true;
    };
  }, [selectedGenre]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const warmShelves = () => {
      const genresToWarm = LOUNGE_GENRES
        .filter((genre) => genre.key !== "popular")
        .map((genre) => genre.key as RecommendationGenreKey)
        .filter((genre) => !readCachedRecommendationShelf(genre, 12));

      genresToWarm.forEach((genre, index) => {
        window.setTimeout(() => {
          void fetchRecommendationShelf(genre, 12)
            .then((shelf) => {
              writeCachedRecommendationShelf(genre, 12, shelf);
              setLoadedShelves((current) =>
                current[genre] ? current : { ...current, [genre]: shelf },
              );
            })
            .catch((error) => {
              console.warn(`Failed to warm ${genre} shelf cache.`, error);
            });
        }, index * 250);
      });
    };

    if ("requestIdleCallback" in window && "cancelIdleCallback" in window) {
      const handle = window.requestIdleCallback(warmShelves);
      return () => {
        window.cancelIdleCallback(handle);
      };
    }

    const handle = setTimeout(warmShelves, 1200);
    return () => {
      clearTimeout(handle);
    };
  }, []);

  const handleSearch = async (query: string) => {
    if (!query) {
      setPrimaryResults([]);
      setWebResults([]);
      setWebArchiveError(null);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setWebArchiveError(null);
    setLastSearchQuery(query);

    try {
      const openArchiveSearchPromise = fetch(
        `/api/open-archive-search?q=${encodeURIComponent(query)}`,
      ).then((res) => res.json());
      const gutenbergPromise = fetchGutenbergBooks(query);

      const [openArchiveData, gutenbergData] = await Promise.allSettled([
        openArchiveSearchPromise,
        gutenbergPromise,
      ]);

      if (openArchiveData.status === "fulfilled" &&
          openArchiveData.value != null &&
          !openArchiveData.value.error &&
          Array.isArray(openArchiveData.value)) {
        setWebResults(openArchiveData.value);
      } else {
        const archiveError = openArchiveData.status === "rejected"
          ? "The open archive search could not be reached."
          : (openArchiveData.value && openArchiveData.value.error) || "The open archive search returned an invalid response.";
        console.error(
          "Open archive search failed:",
          openArchiveData.status === "rejected" ? openArchiveData.reason :
          archiveError,
        );
        setWebResults([]);
        setWebArchiveError(archiveError);
      }

      if (gutenbergData.status === "fulfilled") {
        setPrimaryResults(gutenbergData.value || []);
        setPrimaryStatusMessage("");
      } else {
        console.error("Gutenberg search failed:", gutenbergData.reason);
        setPrimaryResults([]);
        setPrimaryStatusMessage(
          "Primary archive is currently unavailable.",
        );
      }
    } catch (error) {
      console.error("An error occurred during search:", error);
      setPrimaryResults([]);
      setWebResults([]);
      setWebArchiveError("The open archive search could not be reached.");
      setPrimaryStatusMessage(
        "Primary archive is currently unavailable.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenreSelect = (genre: any) => {
    setSelectedGenre(genre);
    setHasSearched(false);
    setPrimaryResults([]);
    setWebResults([]);
    setWebArchiveError(null);
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
                  ? (webArchiveError ? "No Gutenberg books matched that search, and Open Archive is temporarily unavailable." : "No Gutenberg books matched that search. Open archive PDF/TXT results may still appear below.")
                  : (webArchiveError ? "No data streams in the primary network match the provided signature. Open Archive is temporarily unavailable." : "No data streams in the primary network match the provided signature. Open archive results may still appear below."))}
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <>
        {primaryResults.map((book, index) => (
          <SearchResultCard key={`${book.source}-${book.id}-${index}`} book={book} />
        ))}
      </>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center p-8 col-span-full">
          <LoaderCircle className="h-8 w-8 animate-spin text-accent" />
          <p className="ml-4 text-muted-foreground">Querying open knowledge nodes...</p>
        </div>
      );
    }

    if (hasSearched) {
      return (
        <>
          <section className="col-span-full">
            <h2 className={uiMode === "motion" ? "font-motion text-2xl font-semibold italic text-[#0b0b0c] mb-6 pb-2" : "font-headline text-lg text-accent/80 mb-4 border-b border-dashed border-border pb-2"}>
              {uiMode === "lounge" ? "Library Results" : uiMode === "motion" ? "Archival Matches" : "// PRIMARY_ARCHIVE_RESULTS"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {renderPrimaryResults()}
            </div>
          </section>
          <WebFallbackResults results={webResults} error={webArchiveError} onRetry={() => handleSearch(lastSearchQuery)} />
        </>
      );
    }

    return (
      <section className="col-span-full">
        <h2 className="font-headline text-lg text-accent/80 mb-4">
          {uiMode === "lounge"
            ? `Recommended Books (${featuredSourceLabel})`
            : `// FEATURED_LOGS from the ${featuredSourceLabel}`}
        </h2>
        {isFeaturedLoading && featuredBooks.length === 0 ? (
          <div className="flex justify-center items-center p-8">
            <LoaderCircle className="h-8 w-8 animate-spin text-accent" />
            <p className="ml-4 text-muted-foreground">
              {uiMode === "lounge"
                ? "Loading book recommendations..."
                : "Loading recommendations..."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {featuredBooks.map((book, index) => (
              <SearchResultCard key={`${book.source}-${book.id}-${index}`} book={book} />
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

  if (uiMode === "motion") {
    const activeRecommendationBooks =
      selectedGenre.key === "popular" ? featuredBooks : genreBooks;
    const recommendationBooks =
      activeRecommendationBooks.length > 0
        ? activeRecommendationBooks
        : featuredBooks.length > 0
          ? featuredBooks
          : getFallbackGutenbergBooks().slice(0, 12);
    const isRecommendationLoading =
      selectedGenre.key === "popular" ? isFeaturedLoading : isGenreLoading;
    const recommendationSourceLabel =
      selectedGenre.key === "popular" ? featuredSourceLabel : genreSourceLabel;

    return (
      <div className="motion-vinyl-layout">
        <section className="motion-vinyl-hero">
          <div className="motion-vinyl-media" aria-hidden="true">
            <img src={MOTION_HERO_POSTER} alt="" className="motion-vinyl-poster" />
            <video
              className="motion-vinyl-video"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster={MOTION_HERO_POSTER}
              onCanPlay={(event) => event.currentTarget.classList.add("is-ready")}
              aria-hidden="true"
            >
              <source src={MOTION_HERO_VIDEO} type="video/mp4" />
            </video>
          </div>
          <div className="motion-vinyl-wash" aria-hidden="true" />
          <div className="motion-vinyl-inner">
            <p className="motion-vinyl-kicker">PAGE.OS / THE OPEN ARCHIVE</p>
            <h1 className="motion-vinyl-headline">
              <span><span>The next page you need</span></span>
              <span><span>is waiting somewhere now</span></span>
            </h1>
            <p className="motion-vinyl-lede">Open a living shelf of public-domain books, visual culture, and ideas waiting to be found.</p>
            <div className="motion-vinyl-hero-actions">
              <button
                type="button"
                className="motion-vinyl-primary"
                onClick={() => document.getElementById("motion-discover")?.scrollIntoView({ behavior: "smooth" })}
              >
                Enter the archive <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="motion-vinyl-issue" aria-hidden="true"><span>01</span><i /><span>∞</span></div>
        </section>

        <MotionRecommendationShelf
          genres={LOUNGE_GENRES}
          selectedGenre={selectedGenre}
          onSelectGenre={handleGenreSelect}
          books={recommendationBooks}
          isLoading={isRecommendationLoading}
          sourceLabel={recommendationSourceLabel}
          onBookClick={showBriefing}
        />

        <section id="motion-discover" className="motion-discover motion-orbit-section">
          <div className="motion-orbit-hero-stage">
            <video ref={orbitVideoRef} className="motion-orbit-video" muted playsInline preload="auto" aria-hidden="true">
              <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260530_042513_df96a13b-6155-4f6e-8b93-c9dee66fba08.mp4" type="video/mp4" />
            </video>
            <div className="motion-orbit-overlay" aria-hidden="true" />
            <div className="motion-orbit-intro">
              <p className="motion-orbit-blur">Hey there, meet P.A.G.E.,<br />Public Archive Gateway Explorer</p>
              <p className="motion-orbit-typewriter">{orbitGreeting}<span className="motion-orbit-cursor" /></p>
              <div id="motion-search" className="motion-orbit-inline-search">
                <CommandSearch onSearch={handleSearch} />
                {hasSearched && lastSearchQuery && (
                  <button
                    type="button"
                    onClick={() => document.getElementById("motion-results")?.scrollIntoView({ behavior: "smooth" })}
                    className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-[#0b0b0c]/60 hover:text-[#6c55db] transition-colors font-mono uppercase tracking-wider"
                  >
                    <span>Viewing results for &ldquo;{lastSearchQuery}&rdquo; below</span>
                    <ChevronDown className="w-3.5 h-3.5 animate-bounce text-[#6c55db]" />
                  </button>
                )}
              </div>
              <div className="motion-orbit-signal" aria-label="Archive status">
                <div><span>LIVE INDEX</span><strong>Open archive</strong><small>Books, images, and ideas in motion</small></div>
                <div><span>RECOMMENDED</span><strong>{featuredBooks.length || "∞"}</strong><small>Fresh paths to follow</small></div>
                <div><span>MODE</span><strong>WANDER</strong><small>Move your pointer to explore</small></div>
              </div>
            </div>
          </div>
          {hasSearched ? (
            <div id="motion-results" className="motion-orbit-results-container scroll-mt-6">
              <div className="motion-orbit-inline-results">{renderContent()}</div>
            </div>
          ) : null}
        </section>
      </div>
    );
  }

  if (uiMode === "lounge") {
    const activeRecommendationBooks =
      selectedGenre.key === "popular" ? featuredBooks.slice(0, 8) : genreBooks.slice(0, 8);
    const recommendationBooks = hasSearched ? primaryResults : activeRecommendationBooks;
    // Spotlight should open on a real invitation to read, not a reference
    // work like a dictionary or a contents-only record (shared predicate —
    // shelves are already filtered server-side, this guards the fallback).
    const isSpotlightWorthy = (book: SearchResult) => !isReferenceWork(book);
    const spotlightBook =
      activeRecommendationBooks.find(isSpotlightWorthy) ??
      featuredBooks.find(isSpotlightWorthy) ??
      getFallbackGutenbergBooks().find(isSpotlightWorthy) ??
      activeRecommendationBooks[0] ??
      featuredBooks[0] ??
      getFallbackGutenbergBooks()[0];
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
            <div className="library-hero-badge">
              <span className="library-hero-badge-dot" /> Fresh shelves, open daily
            </div>
            <p className="library-kicker">PAGE.OS</p>
            <h1>
              Escape into a world of <span className="library-hero-accent">words</span>
            </h1>
            <p>
              Discover public-domain books, open knowledge, and artwork from
              trusted cultural archives in a calmer space built for wandering.
            </p>
            <div className="library-actions">
              <a href="#recommendations" className="library-primary-action">
                Start Reading <ChevronRight className="h-4 w-4" />
              </a>
              <a href="#search" className="library-secondary-action">
                Search Library
              </a>
              <Link href="/infinite" className="library-secondary-action">
                Explore Artwork <Images className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="library-orbit" aria-hidden="true">
            {featuredBooks.slice(0, 7).map((book, index) => (
              <div
                key={`${book.id}-${index}`}
                className="library-orbit-book"
                style={
                  {
                    ...(getBookCover(book)
                      ? { backgroundImage: `url(${getBookCover(book)})` }
                      : {}),
                    ["--orbit-angle" as string]: `${index * (360 / 7)}deg`,
                    ["--orbit-delay" as string]: `${index * -3.2}s`,
                    ["--book-tilt" as string]: `${index % 2 === 0 ? -10 : 10}deg`,
                  } as CSSProperties
                }
              />
            ))}
            <div className="library-orbit-ring orbit-ring-outer" />
            <div className="library-orbit-ring orbit-ring-inner" />
            <div className="library-orbit-title">
              <span>Find your next read</span>
            </div>
          </div>
        </section>

        <section id="search" className="library-search-card">
          <div>
            <h2>What do you want to read?</h2>
            <p>Search by title, author, genre, topic, or open archive query.</p>
          </div>
          <CommandSearch onSearch={handleSearch} />
        </section>

        <div className="library-tabs library-template-pills" aria-label="Book categories">
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
                        Open archive PDF/TXT results may still be available below.
                      </p>
                    </CardContent>
                  </Card>
                )}
                <WebFallbackResults results={webResults} error={webArchiveError} onRetry={() => handleSearch(lastSearchQuery)} />
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

                  {isRecommendationLoading && activeRecommendationBooks.length === 0 ? (
                    <div className="library-loading">
                      <LoaderCircle className="h-6 w-6 animate-spin" />
                      <span>
                        Curating {selectedGenre.label.toLowerCase()} recommendations...
                      </span>
                    </div>
                  ) : spotlightBook ? (
                    <div className="library-spotlight library-template-feature">
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
                        <button type="button" onClick={() => showBriefing(spotlightBook)} className="library-read-now">
                          Start reading
                        </button>
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
                  {isRecommendationLoading && shelfBooks.length === 0 ? (
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
        <h1 className="text-3xl font-headline text-accent">SYSTEM_FEED</h1>
        <p className="text-muted-foreground">
          Search for transmissions and memory logs across the network.
        </p>
      </div>

      <CommandSearch onSearch={handleSearch} />

      <div className="grid grid-cols-1 gap-8">{renderContent()}</div>
    </div>
  );
}


