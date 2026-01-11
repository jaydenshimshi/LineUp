'use client';

/**
 * Today card component - main check-in interface
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type GameStatus = 'game_on' | 'not_enough' | 'cancelled';

interface TodayCardProps {
  playerId: string;
  date: Date;
  isCheckedIn: boolean;
  checkedInCount: number;
  minimumPlayers: number;
  gameStatus: GameStatus;
  cutoffTime?: string;
}

const STATUS_CONFIG: Record<
  GameStatus,
  { label: string; color: string; bgColor: string }
> = {
  game_on: {
    label: 'GAME ON',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  not_enough: {
    label: 'NOT ENOUGH PLAYERS',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  cancelled: {
    label: 'CANCELLED',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
};

export function TodayCard({
  playerId,
  date,
  isCheckedIn: initialCheckedIn,
  checkedInCount: initialCount,
  minimumPlayers,
  gameStatus,
  cutoffTime,
}: TodayCardProps) {
  const router = useRouter();
  const [isCheckedIn, setIsCheckedIn] = useState(initialCheckedIn);
  const [checkedInCount, setCheckedInCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  const statusConfig = STATUS_CONFIG[gameStatus];
  const dateString = format(date, 'yyyy-MM-dd');

  async function handleToggleCheckIn() {
    setIsLoading(true);

    try {
      const supabase = createClient();

      if (isCheckedIn) {
        // Check out - delete the checkin record
        const { error } = await supabase
          .from('checkins')
          .delete()
          .eq('player_id', playerId)
          .eq('date', dateString);

        if (error) {
          console.error('Error checking out:', error);
          return;
        }

        setIsCheckedIn(false);
        setCheckedInCount((prev) => Math.max(0, prev - 1));
      } else {
        // Check in - upsert the checkin record
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

        setIsCheckedIn(true);
        setCheckedInCount((prev) => prev + 1);
      }

      router.refresh();
    } catch (err) {
      console.error('Toggle check-in error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wide">
              Today
            </p>
            <p className="text-2xl font-bold">{format(date, 'EEE, MMM d')}</p>
          </div>
          <Badge
            className={cn(
              'text-sm font-bold px-3 py-1',
              statusConfig.bgColor,
              statusConfig.color
            )}
          >
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Check-in Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <span className="font-medium">Check-in:</span>
          <Button
            onClick={handleToggleCheckIn}
            disabled={isLoading || gameStatus === 'cancelled'}
            variant={isCheckedIn ? 'default' : 'outline'}
            className={cn(
              'min-w-[140px] font-semibold',
              isCheckedIn &&
                'bg-green-600 hover:bg-green-700 text-white'
            )}
          >
            {isLoading
              ? 'Updating...'
              : isCheckedIn
                ? 'Playing'
                : 'Not Playing'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{checkedInCount}</p>
            <p className="text-sm text-gray-500">Players Checked In</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-3xl font-bold text-gray-600">{minimumPlayers}</p>
            <p className="text-sm text-gray-500">Minimum Needed</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                checkedInCount >= minimumPlayers
                  ? 'bg-green-500'
                  : 'bg-yellow-500'
              )}
              style={{
                width: `${Math.min(100, (checkedInCount / minimumPlayers) * 100)}%`,
              }}
            />
          </div>
          <p className="text-xs text-gray-500 text-center">
            {checkedInCount >= minimumPlayers
              ? 'Minimum reached!'
              : `${minimumPlayers - checkedInCount} more needed`}
          </p>
        </div>

        {/* Cutoff time */}
        {cutoffTime && (
          <p className="text-sm text-gray-500 text-center">
            Check-in cutoff: {cutoffTime}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
