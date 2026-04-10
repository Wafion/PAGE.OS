
"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { LoaderCircle, Search } from "lucide-react";

interface CommandSearchProps {
  onSearch: (query: string) => void;
}

export function CommandSearch({ onSearch }: CommandSearchProps) {
  const [value, setValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);

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
    <div className="flex items-center gap-2">
      <div className="relative grow">
        <span className="absolute left-4 top-0 h-full font-body text-accent/80 flex items-center gap-2 pointer-events-none z-10 text-lg">
          <span>&gt;</span>
          {!isSearching && <span className="animate-cursor-blink bg-accent w-2 h-5 inline-block" />}
        </span>
        <Input
          type="text"
          placeholder="Search public domain archives or the web..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSearching}
          className="w-full bg-input border-border/50 pl-14 h-12 text-lg focus:border-accent"
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
