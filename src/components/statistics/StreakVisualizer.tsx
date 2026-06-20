'use client';

import { CalendarDays, Flame, TrendingUp } from 'lucide-react';

interface StreakVisualizerProps {
  currentStreak: number;
  longestStreak: number;
  variant?: 'classic' | 'lounge';
}

export default function StreakVisualizer({
  currentStreak,
  longestStreak,
  variant = 'lounge'
}: StreakVisualizerProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 text-center">
        <Flame className="h-5 w-5 text-accent" />
        <div>
          <div className="font-headline text-xs text-accent/80">Current Streak</div>
          <div className="text-2xl font-bold text-accent">{currentStreak}</div>
          <div className="text-xs text-muted-foreground">days</div>
        </div>
      </div>

      <div className="flex items-center space-x-3 text-center">
        <TrendingUp className="h-5 w-5 text-accent" />
        <div>
          <div className="font-headline text-xs text-accent/80">Longest Streak</div>
          <div className="text-2xl font-bold text-accent">{longestStreak}</div>
          <div className="text-xs text-muted-foreground">days</div>
        </div>
      </div>

      {currentStreak > 0 && (
        <div className="text-xs text-accent/60 text-center">
          {currentStreak === 1
            ? 'Keep the flame alive!'
            : `🔥 ${currentStreak}-day streak active!`}
        </div>
      )}

      {currentStreak === 0 && (
        <div className="text-xs text-muted-foreground text-center">
          Start your reading streak today!
        </div>
      )}
    </div>
  );
}