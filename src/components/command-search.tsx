
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { LoaderCircle, Search } from "lucide-react";
import { useReaderSettings } from "@/context/reader-settings-provider";
import { Switch } from "@/components/ui/switch";
import { fetchGutenbergBooks } from "@/adapters/gutendex";

type SearchSuggestion = {
  id: string;
  title: string;
  meta: string;
  query: string;
  source: "gutendex" | "web";
  href: string;
  openInNewTab?: boolean;
};

interface CommandSearchProps {
  onSearch: (query: string) => void;
}

export function CommandSearch({ onSearch }: CommandSearchProps) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [authorMode, setAuthorMode] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [gutenbergSuggestions, setGutenbergSuggestions] = useState<SearchSuggestion[]>([]);
  const { uiMode } = useReaderSettings();
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionRequestRef = useRef(0);
  const gutenbergSuggestionCacheRef = useRef(new Map<string, SearchSuggestion[]>());

  const trimmedValue = value.trim();
  const effectiveQuery = useMemo(() => {
    if (!trimmedValue) {
      return "";
    }

    return authorMode && !/^author\s*:?\s+/i.test(trimmedValue)
      ? `author: ${trimmedValue}`
      : trimmedValue;
  }, [authorMode, trimmedValue]);

  const handleSearchTrigger = async () => {
    if (!trimmedValue) {
      return;
    }

    setIsSearching(true);
    setShowSuggestions(false);
    await onSearch(effectiveQuery);
    setIsSearching(false);
  };

  useEffect(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (trimmedValue.length < 2) {
      setGutenbergSuggestions([]);
      setIsSuggesting(false);
      return;
    }

    let isCancelled = false;
    const requestId = suggestionRequestRef.current + 1;
    suggestionRequestRef.current = requestId;
    const timeoutId = setTimeout(async () => {
      setIsSuggesting(true);

      const cachedGutenbergSuggestions = gutenbergSuggestionCacheRef.current.get(effectiveQuery);

      if (cachedGutenbergSuggestions) {
        setGutenbergSuggestions(cachedGutenbergSuggestions);
        setIsSuggesting(false);
      } else {
        void fetchGutenbergBooks(effectiveQuery)
          .then((books) => {
            if (
              isCancelled ||
              suggestionRequestRef.current !== requestId
            ) {
              return;
            }

            const mappedSuggestions = books.slice(0, 5).map((book) => ({
              id: `gutendex-${book.id}`,
              title: book.title,
              meta: book.authors || "Unknown author",
              query: book.title,
              source: "gutendex" as const,
              href: `/read?source=${book.source}&id=${book.id}&title=${encodeURIComponent(book.title)}&authors=${encodeURIComponent(book.authors)}&formats=${encodeURIComponent(JSON.stringify(book.formats))}`,
            }));

            gutenbergSuggestionCacheRef.current.set(effectiveQuery, mappedSuggestions);
            setGutenbergSuggestions(mappedSuggestions);
          })
          .catch(() => {
            if (
              isCancelled ||
              suggestionRequestRef.current !== requestId
            ) {
              return;
            }

            setGutenbergSuggestions([]);
          })
          .finally(() => {
            if (
              isCancelled ||
              suggestionRequestRef.current !== requestId
            ) {
              return;
            }

            setIsSuggesting(false);
          });
      }
    }, 260);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [effectiveQuery, trimmedValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchTrigger();
    }
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setValue(suggestion.query);
    setShowSuggestions(false);

    if (suggestion.openInNewTab) {
      window.open(suggestion.href, "_blank", "noopener,noreferrer");
      return;
    }

    router.push(suggestion.href);
  };

  const hasSuggestions = gutenbergSuggestions.length > 0;

  return (
    <div className={uiMode === "lounge" ? "library-command-search" : "flex flex-col gap-3"}>
      <div className="relative grow">
        <span className="absolute left-4 top-0 h-full font-body text-accent/80 flex items-center gap-2 pointer-events-none z-10 text-lg">
          <span>{uiMode === "lounge" ? "" : ">"}</span>
          {uiMode === "classic" && !isSearching && <span className="animate-cursor-blink bg-accent w-2 h-5 inline-block" />}
        </span>
        <Input
          type="text"
          placeholder={
            uiMode === "lounge"
              ? authorMode
                ? "Type an author name like H G Wells or Jane Austen"
                : "Search for a book, topic, PDF, or author"
              : authorMode
                ? "Author search enabled. Type a name like Mary Shelley"
                : "Search archives, the web, books, or authors"
          }
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (blurTimeoutRef.current) {
              clearTimeout(blurTimeoutRef.current);
            }
            setShowSuggestions(true);
          }}
          onBlur={() => {
            blurTimeoutRef.current = setTimeout(() => {
              setShowSuggestions(false);
            }, 120);
          }}
          disabled={isSearching}
          className={
            uiMode === "lounge"
              ? "h-14 w-full rounded-full border border-border/60 bg-card/90 pl-12 pr-14 text-base shadow-sm focus-visible:ring-accent/30"
              : "w-full bg-input border-border/50 pl-14 h-12 text-lg focus:border-accent"
          }
        />
        <button
          onClick={handleSearchTrigger}
          disabled={isSearching}
          className="absolute right-4 top-0 h-full text-accent/80 hover:text-accent transition-colors disabled:opacity-50"
        >
          {isSearching ? <LoaderCircle className="animate-spin" /> : <Search />}
        </button>

        {showSuggestions && trimmedValue.length >= 2 && (
          <div
            className={
              uiMode === "lounge"
                ? "absolute left-0 right-0 top-[calc(100%+0.6rem)] z-30 overflow-hidden rounded-3xl border border-border/60 bg-card/95 shadow-[0_20px_45px_rgba(79,45,22,0.12)] backdrop-blur"
                : "absolute left-0 right-0 top-[calc(100%+0.45rem)] z-30 overflow-hidden border border-border/60 bg-card/95 shadow-xl backdrop-blur"
            }
          >
            {isSuggesting ? (
              <div className="flex items-center gap-3 px-4 py-4 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin text-accent" />
                <span>{uiMode === "lounge" ? "Finding suggestions..." : "Fetching suggestions..."}</span>
              </div>
            ) : hasSuggestions ? (
              <div className="max-h-80 overflow-y-auto py-2">
                {gutenbergSuggestions.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-accent/80">
                      {uiMode === "lounge" ? "From Gutenberg" : "GUTENBERG"}
                    </div>
                    {gutenbergSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSuggestionSelect(suggestion)}
                        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-accent/5"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{suggestion.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{suggestion.meta}</p>
                        </div>
                        <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-accent/80">
                          book
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="px-4 py-4 text-sm text-muted-foreground">
                {uiMode === "lounge"
                  ? "No quick suggestions yet. Press enter to run the full search."
                  : "No quick suggestions found. Press enter to run a full search."}
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className={
          uiMode === "lounge"
            ? "mt-2 flex items-center justify-end gap-2 px-2 text-xs text-muted-foreground"
            : "flex items-center justify-end gap-2 text-xs text-muted-foreground"
        }
      >
        <span className={authorMode ? "text-accent" : ""}>
          {uiMode === "lounge" ? "Author search" : "AUTHOR_SEARCH"}
        </span>
        <Switch
          checked={authorMode}
          onCheckedChange={setAuthorMode}
          aria-label="Toggle author search mode"
          className={
            uiMode === "lounge"
              ? "h-5 w-9 data-[state=unchecked]:bg-border/70 data-[state=checked]:bg-accent/80"
              : "h-5 w-9 data-[state=unchecked]:bg-input data-[state=checked]:bg-accent"
          }
        />
      </div>
    </div>
  );
}

