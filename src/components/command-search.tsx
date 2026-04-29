
"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { LoaderCircle, Search } from "lucide-react";
import { useReaderSettings } from "@/context/reader-settings-provider";

interface CommandSearchProps {
  onSearch: (query: string) => void;
}

export function CommandSearch({ onSearch }: CommandSearchProps) {
  const [value, setValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { uiMode } = useReaderSettings();

  const handleSearchTrigger = async () => {
    setIsSearching(true);
    await onSearch(value);
    setIsSearching(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchTrigger();
    }
  };

  return (
    <div className={uiMode === "lounge" ? "library-command-search" : "flex items-center gap-2"}>
      <div className="relative grow">
        <span className="absolute left-4 top-0 h-full font-body text-accent/80 flex items-center gap-2 pointer-events-none z-10 text-lg">
          <span>{uiMode === "lounge" ? "" : ">"}</span>
          {uiMode === "classic" && !isSearching && <span className="animate-cursor-blink bg-accent w-2 h-5 inline-block" />}
        </span>
        <Input
          type="text"
          placeholder={
            uiMode === "lounge"
              ? "Search for a book, author, topic, or PDF..."
              : "Search public domain archives or the web..."
          }
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
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
      </div>
    </div>
  );
}

