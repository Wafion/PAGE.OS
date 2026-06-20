"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, Clock, Download, Layout, Library, LogIn, LogOut, RotateCw, User as UserIcon } from "lucide-react";
import { useAuth } from "@/context/auth-provider";
import { useReaderSettings } from "@/context/reader-settings-provider";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ReadingStatsNetwork from "@/components/statistics/ReadingStatsNetwork";
import StatCard from "@/components/statistics/StatCard";
import StreakVisualizer from "@/components/statistics/StreakVisualizer";
import ReadingCalendar from "@/components/statistics/ReadingCalendar";
import GenreDistribution from "@/components/statistics/GenreDistribution";
import { calculateAndUpdateUserStatistics, getUserStatistics, type UserStatistics } from "@/services/userData";
import { calculateReadingStreak, formatTime } from "@/lib/statisticsUtils";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { user } = useAuth();
  const { uiMode } = useReaderSettings();
  const { toast } = useToast();
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsRefreshing, setStatsRefreshing] = useState(false);

  useEffect(() => {
    const loadStatistics = async () => {
      if (!user) {
        setStatistics(null);
        setStatsLoading(false);
        return;
      }

      setStatsLoading(true);
      try {
        let stats = await getUserStatistics(user.uid);
        if (!stats) {
          await calculateAndUpdateUserStatistics(user.uid);
          stats = await getUserStatistics(user.uid);
        }
        setStatistics(stats);
      } catch (error) {
        console.error("Failed to load reading statistics:", error);
        toast({
          title: "Statistics unavailable",
          description: "Could not load your reading map right now.",
          variant: "destructive",
        });
      } finally {
        setStatsLoading(false);
      }
    };

    loadStatistics();
  }, [toast, user]);

  const handleRefreshStatistics = async () => {
    if (!user) return;

    setStatsRefreshing(true);
    try {
      await calculateAndUpdateUserStatistics(user.uid);
      const stats = await getUserStatistics(user.uid);
      setStatistics(stats);
    } catch (error) {
      console.error("Failed to refresh reading statistics:", error);
      toast({
        title: "Refresh failed",
        description: "Could not refresh your reading map right now.",
        variant: "destructive",
      });
    } finally {
      setStatsRefreshing(false);
    }
  };

  const handleSignIn = async () => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google: ", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-headline text-accent">
          {uiMode === "lounge" ? "Reader Card" : "USER_PROFILE / LOGIN"}
        </h1>
        <p className="text-muted-foreground">
          {uiMode === "lounge"
            ? "Identity, sync status, and your reading memory."
            : "Operator session logs, preferences, and reading topology."}
        </p>
      </div>

      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="font-headline text-lg text-accent/80">Data Sync</CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                  <AvatarFallback><UserIcon /></AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user.displayName}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-muted-foreground mb-4">
                Connect to Firebase to synchronize your reading history, bookmarks, and preferences across all your devices.
              </p>
              <Button variant="outline" className="border-accent/50 text-accent hover:bg-accent/10 hover:text-accent" onClick={handleSignIn}>
                <LogIn className="mr-2 h-4 w-4"/> Connect with Google
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <ReadingStatsNetwork
          statistics={statistics}
          loading={statsLoading}
          refreshing={statsRefreshing}
          onRefresh={user ? handleRefreshStatistics : undefined}
          variant={uiMode}
        />

        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="font-headline text-lg text-accent/80">
                  {uiMode === "lounge" ? "Reading Memory" : "READING_METRICS"}
                </CardTitle>
                <CardDescription>
                  {user
                    ? "A compact readout of your saved library activity."
                    : "Sign in to build a synced reading map."}
                </CardDescription>
              </div>
              {user && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRefreshStatistics}
                  disabled={statsRefreshing}
                  aria-label="Refresh reading statistics"
                >
                  <RotateCw className={`h-4 w-4 text-accent ${statsRefreshing ? "animate-spin" : ""}`} />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex min-h-32 items-center justify-center gap-3 text-sm text-muted-foreground">
                <RotateCw className="h-4 w-4 animate-spin text-accent" />
                Loading reading memory...
              </div>
            ) : statistics ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard title="Books Completed" value={statistics.booksCompleted} label="Finished reads" icon={BookOpen} />
                <StatCard title="Time Read" value={formatTime(statistics.totalTimeSpentReading)} label="Total engagement" icon={Clock} />
                <StatCard title="Average Session" value={formatTime(statistics.averageSessionLength)} label="Per visit" icon={Layout} />
                <StatCard title="Library Size" value={statistics.totalBooksInLibrary} label="Saved books" icon={Library} />
              </div>
            ) : (
              <div className="rounded-lg border border-border/50 bg-background/50 p-5 text-sm text-muted-foreground">
                No reading statistics yet. Saved books and tracked sessions will appear here.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {statistics && (
        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="font-headline text-lg text-accent/80">Reading Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <StreakVisualizer
                {...(statistics.readingCalendar && Object.keys(statistics.readingCalendar).length > 0
                  ? calculateReadingStreak(statistics.readingCalendar)
                  : {
                      currentStreak: statistics.readingStreak,
                      longestStreak: statistics.longestStreak,
                    })}
                variant={uiMode}
              />
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="font-headline text-lg text-accent/80">Reading Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <ReadingCalendar readingCalendar={statistics.readingCalendar || {}} variant={uiMode} />
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="font-headline text-lg text-accent/80">Genre Clusters</CardTitle>
            </CardHeader>
            <CardContent>
              <GenreDistribution booksByGenre={statistics.booksByGenre || {}} variant={uiMode} />
            </CardContent>
          </Card>
        </section>
      )}

      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="font-headline text-lg text-accent/80">Export Data</CardTitle>
           <CardDescription>
            This feature is currently under development.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Button variant="outline" className="border-border/50" disabled>
            <Download className="mr-2 h-4 w-4" /> EXPORT_PINS
          </Button>
          <Button variant="outline" className="border-border/50" disabled>
            <Download className="mr-2 h-4 w-4" /> EXPORT_COMPLETED_LOGS
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
