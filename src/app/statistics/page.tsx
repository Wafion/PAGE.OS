'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Layout, List, RotateCw, BookOpen } from 'lucide-react';
import { useReaderSettings } from '@/context/reader-settings-provider';
import { useAuth } from '@/context/auth-provider';
import { getUserStatistics, calculateAndUpdateUserStatistics } from '@/services/userData';
import { calculateReadingStreak, formatTime } from '@/lib/statisticsUtils';
import StatCard from '@/components/statistics/StatCard';
import StreakVisualizer from '@/components/statistics/StreakVisualizer';
import GenreDistribution from '@/components/statistics/GenreDistribution';
import ReadingCalendar from '@/components/statistics/ReadingCalendar';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function StatisticsPage() {
  const { user } = useAuth();
  const { uiMode } = useReaderSettings();
  const { toast } = useToast();
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch statistics on mount and when user changes
  useEffect(() => {
    const loadStatistics = async () => {
      if (!user) {
        setStatistics(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Try to get existing statistics
        let stats = await getUserStatistics(user.uid);

        // If no statistics exist, calculate them
        if (!stats) {
          await calculateAndUpdateUserStatistics(user.uid);
          stats = await getUserStatistics(user.uid);
        }

        setStatistics(stats);
      } catch (error) {
        console.error('Failed to load statistics:', error);
        toast({
          title: 'Error',
          description: 'Failed to load reading statistics',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadStatistics();
  }, [user, toast]);

  // Refresh statistics
  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      await calculateAndUpdateUserStatistics(user.uid);
      const stats = await getUserStatistics(user.uid);
      setStatistics(stats);
      toast({
        title: 'Statistics Updated',
        description: 'Your reading statistics have been refreshed',
      });
    } catch (error) {
      console.error('Failed to refresh statistics:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh statistics',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4">
        <div className="flex items-center space-x-3">
          <RotateCw className="h-5 w-5 animate-spin text-accent" />
          <p className="text-accent/80">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 text-center">
        <div className="space-y-4">
          <List className="h-8 w-8 text-accent/50" />
          <h2 className="font-headline text-lg text-accent/80">Please Log In</h2>
          <p className="text-muted-foreground max-w-xl">
            Sign in to view your reading statistics and track your progress over time.
          </p>
          <Link href="/profile">
            <Button asChild variant="outline" size="sm">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 text-center">
        <div className="space-y-4">
          <List className="h-8 w-8 text-accent/50" />
          <h2 className="font-headline text-lg text-accent/80">No Statistics Yet</h2>
          <p className="text-muted-foreground max-w-xl">
            Start reading books to generate your personal reading statistics.
          </p>
          <Link href="/">
            <Button asChild variant="outline" size="sm">
              Explore Library
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate streak from reading calendar if available
  const { currentStreak, longestStreak } = statistics.readingCalendar && Object.keys(statistics.readingCalendar).length > 0
    ? calculateReadingStreak(statistics.readingCalendar)
    : { currentStreak: 0, longestStreak: 0 };

  return (
    <div className="flex min-h-[100dvh] flex-col px-4 pt-16">
      <header className="mb-6">
        <h1 className="text-3xl font-headline text-accent">{uiMode === 'lounge' ? 'Reading Statistics' : '// READING_METRICS'}</h1>
        <p className="text-muted-foreground">
          {uiMode === 'lounge'
            ? 'Insights into your reading habits and progress'
            : 'Monitoring transmission efficiency and archive engagement'}
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Books Completed */}
        <StatCard
          title="Books Completed"
          value={statistics.booksCompleted}
          label="Finished transmissions"
          icon={List}
        />
        {/* Total Time */}
        <StatCard
          title="Time Read"
          value={formatTime(statistics.totalTimeSpentReading)}
          label="Total engagement"
          icon={Clock}
        />
        {/* Average Session */}
        <StatCard
          title="Average Session"
          value={formatTime(statistics.averageSessionLength)}
          label="Per transmission"
          icon={Layout}
        />
        {/* Books in Library */}
        <StatCard
          title="Library Size"
          value={statistics.totalBooksInLibrary}
          label="Archived transmissions"
          icon={List}
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6">
        {/* Left Column - Streak and Calendar */}
        <div className="lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Streak Visualizer */}
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <RotateCw className="h-4 w-4 text-accent" />
                  <CardTitle className="font-headline text-xs text-accent/80">Reading Streak</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <StreakVisualizer
                  currentStreak={currentStreak}
                  longestStreak={longestStreak}
                  variant={uiMode}
                />
              </CardContent>
            </Card>

            {/* Reading Calendar */}
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-accent" />
                  <CardTitle className="font-headline text-xs text-accent/80">Reading Calendar</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ReadingCalendar
                  readingCalendar={statistics.readingCalendar || {}}
                  variant={uiMode}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Genre Distribution */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2 justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4 text-accent" />
                  <CardTitle className="font-headline text-xs text-accent/80">Genre Distribution</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRefresh}
                  className="h-8 w-8"
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <RotateCw className="h-4 w-4 animate-spin text-accent" />
                  ) : (
                    <RotateCw className="h-4 w-4 text-accent" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <GenreDistribution
                booksByGenre={statistics.booksByGenre || {}}
                variant={uiMode}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer with last updated */}
      <div className="mt-8 text-center text-xs text-muted-foreground">
        Last updated: {new Date(statistics.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
}