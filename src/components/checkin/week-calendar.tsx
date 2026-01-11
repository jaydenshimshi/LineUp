'use client';

/**
 * Week calendar component - displays current week with check-in toggles
 */

import { useState, useEffect, useCallback } from 'react';
import { format, startOfWeek, addDays, isToday, isBefore, startOfDay } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DayCheckin {
  date: string;
  isCheckedIn: boolean;
  totalCount: number;
}

interface WeekCalendarProps {
  playerId: string;
  initialCheckins: DayCheckin[];
}

const MINIMUM_PLAYERS = 6;

export function WeekCalendar({ playerId, initialCheckins }: WeekCalendarProps) {
  const [checkins, setCheckins] = useState<DayCheckin[]>(initialCheckins);
  const [loadingDays, setLoadingDays] = useState<Set<string>>(new Set());

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday start

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const dateString = format(date, 'yyyy-MM-dd');
    const checkin = checkins.find((c) => c.date === dateString);
    return {
      date,
      dateString,
      isToday: isToday(date),
      isPast: isBefore(date, startOfDay(today)),
      isCheckedIn: checkin?.isCheckedIn || false,
      totalCount: checkin?.totalCount || 0,
    };
  });

  // Subscribe to real-time check-in updates
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('checkins-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkins',
        },
        async (payload) => {
          // Refresh counts for the affected date
          const affectedDate = (payload.new as { date?: string })?.date ||
                               (payload.old as { date?: string })?.date;

          if (affectedDate) {
            const { count } = await supabase
              .from('checkins')
              .select('*', { count: 'exact', head: true })
              .eq('date', affectedDate)
              .eq('status', 'checked_in');

            setCheckins((prev) =>
              prev.map((c) =>
                c.date === affectedDate
                  ? { ...c, totalCount: count || 0 }
                  : c
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleToggle = useCallback(async (dateString: string, currentlyCheckedIn: boolean) => {
    setLoadingDays((prev) => new Set([...prev, dateString]));

    try {
      const supabase = createClient();

      if (currentlyCheckedIn) {
        // Check out
        const { error } = await supabase
          .from('checkins')
          .delete()
          .eq('player_id', playerId)
          .eq('date', dateString);

        if (error) {
          console.error('Error checking out:', error);
          return;
        }

        setCheckins((prev) =>
          prev.map((c) =>
            c.date === dateString
              ? { ...c, isCheckedIn: false, totalCount: Math.max(0, c.totalCount - 1) }
              : c
          )
        );
      } else {
        // Check in
        const { error } = await supabase.from('checkins').upsert(
          {
            player_id: playerId,
            date: dateString,
            status: 'checked_in',
          } as never,
          { onConflict: 'player_id,date' }
        );

        if (error) {
          console.error('Error checking in:', error);
          return;
        }

        setCheckins((prev) =>
          prev.map((c) =>
            c.date === dateString
              ? { ...c, isCheckedIn: true, totalCount: c.totalCount + 1 }
              : c
          )
        );
      }
    } finally {
      setLoadingDays((prev) => {
        const next = new Set(prev);
        next.delete(dateString);
        return next;
      });
    }
  }, [playerId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Week of {format(weekStart, 'MMM d')}
        </h2>
        <Badge variant="outline">
          {format(weekStart, 'yyyy')}
        </Badge>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const isLoading = loadingDays.has(day.dateString);
          const hasEnoughPlayers = day.totalCount >= MINIMUM_PLAYERS;

          return (
            <Card
              key={day.dateString}
              className={cn(
                'relative overflow-hidden transition-all',
                day.isToday && 'ring-2 ring-green-500',
                day.isPast && 'opacity-60'
              )}
            >
              <CardContent className="p-3 text-center">
                {/* Day name */}
                <p className="text-xs text-gray-500 uppercase">
                  {format(day.date, 'EEE')}
                </p>

                {/* Day number */}
                <p
                  className={cn(
                    'text-2xl font-bold mt-1',
                    day.isToday && 'text-green-600'
                  )}
                >
                  {format(day.date, 'd')}
                </p>

                {/* Player count */}
                <div className="mt-2">
                  <Badge
                    variant={hasEnoughPlayers ? 'default' : 'secondary'}
                    className={cn(
                      'text-xs',
                      hasEnoughPlayers && 'bg-green-100 text-green-700'
                    )}
                  >
                    {day.totalCount} players
                  </Badge>
                </div>

                {/* Check-in toggle */}
                <Button
                  size="sm"
                  variant={day.isCheckedIn ? 'default' : 'outline'}
                  className={cn(
                    'w-full mt-3',
                    day.isCheckedIn && 'bg-green-600 hover:bg-green-700'
                  )}
                  onClick={() => handleToggle(day.dateString, day.isCheckedIn)}
                  disabled={isLoading || day.isPast}
                >
                  {isLoading
                    ? '...'
                    : day.isCheckedIn
                      ? 'Playing'
                      : 'Not Playing'}
                </Button>

                {/* Today indicator */}
                {day.isToday && (
                  <div className="absolute top-1 right-1">
                    <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full">
                      Today
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-300" />
          <span>Game likely ({'>'}={MINIMUM_PLAYERS} players)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300" />
          <span>Need more players</span>
        </div>
      </div>
    </div>
  );
}
