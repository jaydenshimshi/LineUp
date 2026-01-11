'use client';

/**
 * Check-in Client Component
 * Beautiful calendar UI for marking availability
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays, startOfWeek, isSameDay, isToday, isPast } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CheckinClientProps {
  orgId: string;
  orgSlug: string;
  playerId: string;
  playerName: string;
  initialCheckins: Record<string, 'checked_in' | 'checked_out'>;
  checkinCounts: Record<string, number>;
}

export function CheckinClient({
  orgId,
  orgSlug,
  playerId,
  playerName,
  initialCheckins,
  checkinCounts,
}: CheckinClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [checkins, setCheckins] = useState(initialCheckins);
  const [loadingDate, setLoadingDate] = useState<string | null>(null);

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });

  // Generate 14 days starting from today
  const days: Date[] = [];
  for (let i = 0; i < 14; i++) {
    days.push(addDays(today, i));
  }

  // Split into weeks
  const thisWeek = days.slice(0, 7);
  const nextWeek = days.slice(7, 14);

  const handleToggleCheckin = async (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    setLoadingDate(dateString);

    const currentStatus = checkins[dateString];
    const newStatus = currentStatus === 'checked_in' ? 'checked_out' : 'checked_in';

    try {
      const response = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: playerId,
          organizationId: orgId,
          date: dateString,
          status: newStatus,
        }),
      });

      if (response.ok) {
        setCheckins((prev) => ({
          ...prev,
          [dateString]: newStatus,
        }));
        startTransition(() => {
          router.refresh();
        });
      }
    } catch (error) {
      console.error('Failed to update check-in:', error);
    } finally {
      setLoadingDate(null);
    }
  };

  const DayCard = ({ date }: { date: Date }) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const status = checkins[dateString];
    const isCheckedIn = status === 'checked_in';
    const count = checkinCounts[dateString] || 0;
    const isPastDay = isPast(date) && !isToday(date);
    const isTodayDate = isToday(date);

    return (
      <button
        onClick={() => !isPastDay && handleToggleCheckin(date)}
        disabled={isPastDay || loadingDate === dateString}
        className={cn(
          'relative flex flex-col items-center p-3 sm:p-4 rounded-xl border-2 transition-all duration-200',
          'hover:scale-105 active:scale-95',
          isPastDay && 'opacity-50 cursor-not-allowed hover:scale-100',
          isCheckedIn
            ? 'border-primary bg-primary/10 shadow-sm'
            : 'border-border bg-card hover:border-primary/50',
          isTodayDate && !isCheckedIn && 'border-primary/50 ring-2 ring-primary/20',
          loadingDate === dateString && 'animate-pulse'
        )}
      >
        {/* Day name */}
        <span className="text-xs font-medium text-muted-foreground uppercase">
          {format(date, 'EEE')}
        </span>

        {/* Date number */}
        <span
          className={cn(
            'text-xl sm:text-2xl font-bold mt-1',
            isCheckedIn ? 'text-primary' : 'text-foreground',
            isTodayDate && 'text-primary'
          )}
        >
          {format(date, 'd')}
        </span>

        {/* Month (on first day or first of month) */}
        {(date.getDate() === 1 || isSameDay(date, today)) && (
          <span className="text-[10px] text-muted-foreground mt-0.5">
            {format(date, 'MMM')}
          </span>
        )}

        {/* Status indicator */}
        <div className="mt-2">
          {isCheckedIn ? (
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <svg className="w-4 h-4 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30" />
          )}
        </div>

        {/* Player count badge */}
        {count > 0 && (
          <Badge
            variant="secondary"
            className={cn(
              'absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center text-[10px] px-1.5',
              count >= 6 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''
            )}
          >
            {count}
          </Badge>
        )}

        {/* Today indicator */}
        {isTodayDate && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-primary">
            Today
          </span>
        )}
      </button>
    );
  };

  const checkedInDays = Object.values(checkins).filter((s) => s === 'checked_in').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto py-6 px-4 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Weekly Check-in</h1>
          <p className="text-muted-foreground mt-1">
            Tap the days you&apos;re available to play
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-3xl font-bold text-primary">{checkedInDays}</p>
              <p className="text-sm text-muted-foreground">Days checked in</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-3xl font-bold">{14 - checkedInDays}</p>
              <p className="text-sm text-muted-foreground">Days available</p>
            </CardContent>
          </Card>
        </div>

        {/* This Week */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-xl">📅</span>
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {thisWeek.map((date) => (
                <DayCard key={date.toISOString()} date={date} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Next Week */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-xl">📆</span>
              Next Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {nextWeek.map((date) => (
                <DayCard key={date.toISOString()} date={date} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-primary" />
            <span>Playing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
            <span>Not playing</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px]">
              6+
            </Badge>
            <span>Game on!</span>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-8 p-4 bg-muted/50 rounded-xl">
          <p className="text-sm text-center text-muted-foreground">
            <span className="font-medium">Tip:</span> Games need at least 6 players.
            Check in early so others know the game is happening!
          </p>
        </div>
      </div>
    </div>
  );
}
