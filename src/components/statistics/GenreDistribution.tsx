'use client';

import { BookOpen } from 'lucide-react';

interface GenreDistributionProps {
  booksByGenre: Record<string, number>;
  variant?: 'classic' | 'lounge';
}

export default function GenreDistribution({
  booksByGenre,
  variant = 'lounge'
}: GenreDistributionProps) {
  // Convert to array and sort by count descending
  const genreArray = Object.entries(booksByGenre)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5 genres

  if (genreArray.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <BookOpen className="h-8 w-8 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground/60">
          No genre data yet.
        </p>
        <p className="text-xs text-muted-foreground/40 mt-1">
          Start reading to see your preferences!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {genreArray.map(({ genre, count }, index) => {
        const percentage = Math.round((count / Math.max(...genreArray.map(g => g.count))) * 100);
        const displayName = genre.length > 28 ? `${genre.slice(0, 28)}...` : genre;
        return (
          <div key={index} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground/80 truncate max-w-[70%]">
                {displayName.charAt(0).toUpperCase() + displayName.slice(1)}
              </span>
              <span className="text-xs font-bold tabular-nums text-accent">
                {count}
              </span>
            </div>
            <div className="w-full bg-border/30 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent/60 to-accent rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}