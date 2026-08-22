'use client';

import { Flame, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="flex flex-col items-center gap-6 py-2">
      <div className="relative">
        <div
          className={cn(
            'flex h-24 w-24 items-center justify-center rounded-full',
            'border-2 transition-all duration-300',
            currentStreak > 0
              ? 'border-accent/40 bg-gradient-to-br from-accent/10 to-accent/5 shadow-lg shadow-accent/10'
              : 'border-border/40 bg-muted/30'
          )}
        >
          <Flame
            className={cn(
              'h-10 w-10 transition-colors',
              currentStreak > 0 ? 'text-accent' : 'text-muted-foreground/30'
            )}
          />
        </div>
        {currentStreak > 0 && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
            <span className="rounded-full bg-accent px-3 py-0.5 text-xs font-bold text-background">
              {currentStreak} day{currentStreak !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 text-center">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Best</p>
          <div className="flex items-center justify-center gap-1.5">
            <Trophy className="h-4 w-4 text-accent/60" />
            <span className="text-lg font-bold tabular-nums text-foreground">
              {longestStreak}
            </span>
            <span className="text-xs text-muted-foreground/60">days</span>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground/60">
        {currentStreak > 0
          ? currentStreak === 1
            ? 'Keep the flame alive!'
            : `🔥 ${currentStreak}-day streak active!`
          : 'Start reading today to begin your streak!'}
      </p>
    </div>
  );
}