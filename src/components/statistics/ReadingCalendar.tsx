'use client';

import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReadingCalendarProps {
  readingCalendar: Record<string, number>; // Map of dates (YYYY-MM-DD) to reading time in seconds
  variant?: 'classic' | 'lounge';
}

export default function ReadingCalendar({
  readingCalendar,
  variant = 'lounge'
}: ReadingCalendarProps) {
  // Get today's date
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-11

  // Get first day of the month
  const firstDay = new Date(currentYear, currentMonth, 1);
  const startingDay = firstDay.getDay(); // 0-6, where 0 is Sunday

  // Get number of days in the month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Get previous month's days for padding
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

  // Generate calendar days
  const days: Array<{
    date: string;
    dayNum: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    readingTime: number;
  }> = [];

  // Add padding days from previous month
  for (let i = 0; i < startingDay; i++) {
    const dayNum = prevMonthDays - startingDay + i + 1;
    const date = new Date(currentYear, currentMonth - 1, dayNum);
    days.push({
      date: date.toISOString().split('T')[0],
      dayNum,
      isCurrentMonth: false,
      isToday: false,
      readingTime: readingCalendar[date.toISOString().split('T')[0]] || 0
    });
  }

  // Add days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(currentYear, currentMonth, i);
    days.push({
      date: date.toISOString().split('T')[0],
      dayNum: i,
      isCurrentMonth: true,
      isToday: date.toDateString() === today.toDateString(),
      readingTime: readingCalendar[date.toISOString().split('T')[0]] || 0
    });
  }

  // Add padding days for next month to complete the grid
  const totalCells = Math.ceil((startingDay + daysInMonth) / 7) * 7;
  for (let i = daysInMonth + 1; i <= totalCells - startingDay; i++) {
    const dayNum = i - daysInMonth;
    const date = new Date(currentYear, currentMonth + 1, dayNum);
    days.push({
      date: date.toISOString().split('T')[0],
      dayNum: dayNum,
      isCurrentMonth: false,
      isToday: false,
      readingTime: readingCalendar[date.toISOString().split('T')[0]] || 0
    });
  }

  // Format reading time for display
  const formatReadingTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes < 60
      ? `${minutes}m ${remainingSeconds > 0 ? remainingSeconds + 's' : ''}`.trim()
      : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  // Get month name
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[currentMonth];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-accent/70" />
          <span className="text-sm font-medium text-foreground">{monthName} {currentYear}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-sm bg-accent/20" />
            <span>Read</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-sm bg-border/30" />
            <span>Rest</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={`header-${i}`} className="py-1.5 text-center text-[10px] font-medium text-muted-foreground/50 uppercase">
            {day}
          </div>
        ))}
        {days.map((day, index) => (
          <div
            key={index}
            className={cn(
              'aspect-square rounded-md flex items-center justify-center text-[11px] font-medium transition-colors',
              day.isToday && 'ring-1.5 ring-accent/60 font-bold',
              day.readingTime > 0
                ? 'bg-accent/15 text-accent'
                : day.isCurrentMonth
                  ? 'text-muted-foreground/50 hover:bg-muted/30'
                  : 'text-muted-foreground/20'
            )}
            title={day.readingTime > 0
              ? `${formatReadingTime(day.readingTime)} read`
              : undefined}
          >
            {day.dayNum}
          </div>
        ))}
      </div>
    </div>
  );
}