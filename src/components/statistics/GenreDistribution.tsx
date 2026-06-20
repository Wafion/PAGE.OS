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
      <div className="text-center py-8">
        <BookOpen className="h-6 w-6 text-accent/50 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">
          No genre data available yet. Start reading to see your preferences!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 mb-2">
        <BookOpen className="h-4 w-4 text-accent" />
        <h3 className="font-headline text-xs text-accent/80">Top Genres</h3>
      </div>

      <div className="space-y-2">
        {genreArray.map(({ genre, count }, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div className="flex-1 text-xs font-medium">
              {genre.charAt(0).toUpperCase() + genre.slice(1)}
            </div>
            <div className="w-16 text-right text-xs">
              {count}
            </div>
            <div className="flex-1">
              <div className="w-full bg-border/50 rounded h-1.5">
                <div
                  className={`h-full bg-accent rounded`}
                  style={{ width: `${Math.min((count / Math.max(...genreArray.map(g => g.count)) * 100), 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}