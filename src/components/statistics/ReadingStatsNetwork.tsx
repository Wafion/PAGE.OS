'use client';

import { BookOpen, Clock, Library, RotateCw, Sparkles } from 'lucide-react';

import type { UserStatistics } from '@/services/userData';
import { calculateReadingStreak, formatTime } from '@/lib/statisticsUtils';
import { cn } from '@/lib/utils';

type ReadingStatsNetworkProps = {
  statistics: UserStatistics | null;
  variant?: 'classic' | 'lounge';
  compact?: boolean;
  loading?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
};

type NetworkNode = {
  id: string;
  label: string;
  value: string;
  x: number;
  y: number;
  size: number;
  tone: 'primary' | 'secondary' | 'muted';
};

export default function ReadingStatsNetwork({
  statistics,
  variant = 'lounge',
  compact = false,
  loading = false,
  onRefresh,
  refreshing = false,
}: ReadingStatsNetworkProps) {
  const streaks = statistics?.readingCalendar && Object.keys(statistics.readingCalendar).length > 0
    ? calculateReadingStreak(statistics.readingCalendar)
    : {
        currentStreak: statistics?.readingStreak ?? 0,
        longestStreak: statistics?.longestStreak ?? 0,
      };

  const topGenre = Object.entries(statistics?.booksByGenre ?? {})
    .sort((a, b) => b[1] - a[1])
    .at(0)?.[0] ?? 'Unmapped';

  const nodes: NetworkNode[] = [
    {
      id: 'core',
      label: variant === 'lounge' ? 'Reading self' : 'CORE',
      value: statistics ? `${statistics.totalBooksInLibrary} books` : 'No signal',
      x: 50,
      y: 50,
      size: 17,
      tone: 'primary',
    },
    {
      id: 'streak',
      label: 'Streak',
      value: `${streaks.currentStreak}d`,
      x: 24,
      y: 28,
      size: 11,
      tone: streaks.currentStreak > 0 ? 'secondary' : 'muted',
    },
    {
      id: 'time',
      label: 'Time',
      value: formatTime(statistics?.totalTimeSpentReading ?? 0),
      x: 76,
      y: 27,
      size: 12,
      tone: (statistics?.totalTimeSpentReading ?? 0) > 0 ? 'secondary' : 'muted',
    },
    {
      id: 'complete',
      label: 'Complete',
      value: String(statistics?.booksCompleted ?? 0),
      x: 25,
      y: 74,
      size: 10,
      tone: (statistics?.booksCompleted ?? 0) > 0 ? 'secondary' : 'muted',
    },
    {
      id: 'session',
      label: 'Avg session',
      value: formatTime(statistics?.averageSessionLength ?? 0),
      x: 78,
      y: 72,
      size: 10,
      tone: (statistics?.averageSessionLength ?? 0) > 0 ? 'secondary' : 'muted',
    },
    {
      id: 'genre',
      label: 'Cluster',
      value: topGenre.length > 18 ? `${topGenre.slice(0, 18)}...` : topGenre,
      x: 50,
      y: 15,
      size: 9,
      tone: topGenre === 'Unmapped' ? 'muted' : 'secondary',
    },
  ];

  const edgeTargets = ['streak', 'time', 'complete', 'session', 'genre'];
  const core = nodes[0];

  return (
    <section
      className={cn(
        'reading-stats-network',
        variant === 'classic' && 'reading-stats-network-classic',
        compact && 'reading-stats-network-compact',
      )}
    >
      <div className="reading-stats-network-header">
        <div>
          <p className={variant === 'lounge' ? 'library-kicker' : 'reading-stats-network-kicker'}>
            {variant === 'lounge' ? 'Reading network' : 'READER NETWORK'}
          </p>
          <h3>{variant === 'lounge' ? 'Your pattern map' : 'STAT_TOPOLOGY'}</h3>
        </div>
        {onRefresh && (
          <button type="button" onClick={onRefresh} disabled={refreshing} aria-label="Refresh reading statistics">
            <RotateCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          </button>
        )}
      </div>

      <div className="reading-stats-network-canvas" aria-hidden="true">
        <svg viewBox="0 0 100 100" role="img">
          <defs>
            <radialGradient id={`reading-node-${variant}`} cx="50%" cy="45%" r="65%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.95" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.18" />
            </radialGradient>
          </defs>
          {edgeTargets.map((targetId) => {
            const target = nodes.find((node) => node.id === targetId);
            if (!target) return null;
            return (
              <line
                key={`${core.id}-${target.id}`}
                x1={core.x}
                y1={core.y}
                x2={target.x}
                y2={target.y}
                className={`reading-stats-network-edge reading-stats-network-edge-${target.tone}`}
              />
            );
          })}
          {nodes.map((node) => (
            <g key={node.id} className={`reading-stats-network-node reading-stats-network-node-${node.tone}`}>
              <circle cx={node.x} cy={node.y} r={node.size} />
              <circle cx={node.x} cy={node.y} r={Math.max(node.size - 5, 3)} />
            </g>
          ))}
        </svg>

        <div className="reading-stats-network-labels">
          {nodes.map((node) => (
            <div
              key={node.id}
              className={`reading-stats-network-label reading-stats-network-label-${node.id}`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <span>{node.label}</span>
              <strong>{loading ? '...' : node.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="reading-stats-network-metrics">
        <div>
          <BookOpen className="h-3.5 w-3.5" />
          <span>{statistics?.booksCompleted ?? 0} done</span>
        </div>
        <div>
          <Clock className="h-3.5 w-3.5" />
          <span>{formatTime(statistics?.totalTimeSpentReading ?? 0)}</span>
        </div>
        <div>
          <Library className="h-3.5 w-3.5" />
          <span>{statistics?.totalBooksInLibrary ?? 0} saved</span>
        </div>
      </div>

      {!statistics && !loading && (
        <p className="reading-stats-network-empty">
          <Sparkles className="h-3.5 w-3.5" />
          Start reading saved books to wake up this map.
        </p>
      )}
    </section>
  );
}
