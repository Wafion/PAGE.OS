'use client';

import { Calendar, Clock } from 'lucide-react';

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
    <div className="space-y-4">
      <div className="flex items-center space-x-3 mb-2">
        <Calendar className="h-4 w-4 text-accent" />
        <h3 className="font-headline text-xs text-accent/80">Monthly Reading</h3>
      </div>

      <div className="text-xs text-accent/60 text-center mb-2">
        {monthName} {currentYear}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-center text-xs border-collapse">
          <thead>
            <tr>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <th key={day} className="py-1 text-accent/60">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day, index) => (
              <tr key={index} className={index % 7 === 0 ? '' : 'hidden sm:table-row'}>
                {day.isCurrentMonth ? (
                  <td className="py-1 px-0.5">
                    <div className={`relative h-6 w-6 mx-auto ${
                      day.isToday ? 'ring-2 ring-accent/50' : ''
                    } ${
                      day.readingTime > 0 ? 'bg-accent/20' : 'bg-border/50'
                    } rounded`}
                      title={day.readingTime > 0
                        ? `${formatReadingTime(day.readingTime)} read`
                        : 'No reading'}
                    >
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
                        {day.dayNum}
                      </div>
                    </div>
                  </td>
                ) : (
                  <td className="py-1 px-0.5">
                    <div className="h-6 w-6 mx-auto text-muted-foreground/50 flex items-center justify-center text-[10px]">
                      {day.dayNum}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-accent/60">
        <div className="flex items-center space-x-2 mb-1">
          <div className="h-3 w-3 rounded bg-accent/20" />
          <span>Reading activity</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded bg-border/50" />
          <span>No reading</span>
        </div>
      </div>
    </div>
  );
}