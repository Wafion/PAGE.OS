'use client';

import { BookOpen, Clock, Flame, Library, Target, TrendingUp } from 'lucide-react';
import type { UserStatistics } from '@/services/userData';
import { calculateReadingStreak, formatTime } from '@/lib/statisticsUtils';
import { cn } from '@/lib/utils';

type ReadingOverviewProps = {
  statistics: UserStatistics | null;
  variant?: 'classic' | 'lounge';
  loading?: boolean;
};

export default function ReadingOverview({
  statistics,
  variant = 'lounge',
  loading = false,
}: ReadingOverviewProps) {
  const streaks = statistics?.readingCalendar && Object.keys(statistics.readingCalendar).length > 0
    ? calculateReadingStreak(statistics.readingCalendar)
    : {
        currentStreak: statistics?.readingStreak ?? 0,
        longestStreak: statistics?.longestStreak ?? 0,
      };

  const stats = [
    {
      icon: Flame,
      label: 'Current Streak',
      value: `${streaks.currentStreak}`,
      unit: 'days',
      active: streaks.currentStreak > 0,
    },
    {
      icon: Clock,
      label: 'Time Read',
      value: formatTime(statistics?.totalTimeSpentReading ?? 0),
      unit: 'total',
      active: (statistics?.totalTimeSpentReading ?? 0) > 0,
    },
    {
      icon: Target,
      label: 'Books Done',
      value: `${statistics?.booksCompleted ?? 0}`,
      unit: 'completed',
      active: (statistics?.booksCompleted ?? 0) > 0,
    },
    {
      icon: Library,
      label: 'Library',
      value: `${statistics?.totalBooksInLibrary ?? 0}`,
      unit: 'books',
      active: (statistics?.totalBooksInLibrary ?? 0) > 0,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-border/40 bg-card/50 p-5"
          >
            <div className="h-4 w-4 rounded bg-muted mb-3" />
            <div className="h-3 w-16 rounded bg-muted mb-2" />
            <div className="h-7 w-12 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={cn(
              'group relative rounded-xl border p-5 transition-all duration-200',
              'hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5',
              stat.active
                ? 'border-accent/20 bg-gradient-to-br from-card to-accent/5'
                : 'border-border/40 bg-card/50'
            )}
          >
            <div className="flex items-center gap-2 mb-3">
              <Icon
                className={cn(
                  'h-4 w-4 transition-colors',
                  stat.active ? 'text-accent' : 'text-muted-foreground/60'
                )}
              />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  'text-3xl font-bold tabular-nums tracking-tight',
                  stat.active ? 'text-accent' : 'text-muted-foreground/40'
                )}
              >
                {stat.value}
              </span>
              <span className="text-xs text-muted-foreground/60">{stat.unit}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
