'use client';

/**
 * Organization Today Client Component
 * Handles check-in toggle and status display
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface OrgTodayClientProps {
  orgId: string;
  orgSlug: string;
  playerId: string;
  isCheckedIn: boolean;
  checkedInCount: number;
  date: Date;
}

const MINIMUM_PLAYERS = 6;

export function OrgTodayClient({
  orgId,
  orgSlug,
  playerId,
  isCheckedIn: initialCheckedIn,
  checkedInCount: initialCount,
  date,
}: OrgTodayClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCheckedIn, setIsCheckedIn] = useState(initialCheckedIn);
  const [checkedInCount, setCheckedInCount] = useState(initialCount);

  const gameStatus = checkedInCount >= MINIMUM_PLAYERS ? 'game_on' : 'not_enough';
  const dateString = format(date, 'yyyy-MM-dd');

  const handleToggleCheckin = async () => {
    const newStatus = !isCheckedIn;

    // Optimistic update
    setIsCheckedIn(newStatus);
    setCheckedInCount((prev) => prev + (newStatus ? 1 : -1));

    try {
      const response = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          date: dateString,
          status: newStatus ? 'checked_in' : 'checked_out',
          organizationId: orgId,
        }),
      });

      if (!response.ok) {
        // Revert on error
        setIsCheckedIn(!newStatus);
        setCheckedInCount((prev) => prev + (newStatus ? -1 : 1));
      } else {
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      // Revert on error
      setIsCheckedIn(!newStatus);
      setCheckedInCount((prev) => prev + (newStatus ? -1 : 1));
    }
  };

  return (
    <Card className="overflow-hidden">
      <div
        className={`h-2 ${
          gameStatus === 'game_on'
            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
            : 'bg-gradient-to-r from-amber-500 to-orange-500'
        }`}
      />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Today&apos;s Game</CardTitle>
          <Badge
            variant={gameStatus === 'game_on' ? 'default' : 'secondary'}
            className={
              gameStatus === 'game_on'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
            }
          >
            {gameStatus === 'game_on' ? 'Game On!' : 'Need More Players'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Player Count */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold">{checkedInCount}</p>
            <p className="text-sm text-muted-foreground">
              {checkedInCount === 1 ? 'player' : 'players'} checked in
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Minimum needed</p>
            <p className="text-lg font-medium">{MINIMUM_PLAYERS}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                gameStatus === 'game_on'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500'
              }`}
              style={{
                width: `${Math.min(100, (checkedInCount / MINIMUM_PLAYERS) * 100)}%`,
              }}
            />
          </div>
          {gameStatus !== 'game_on' && (
            <p className="text-sm text-muted-foreground text-center">
              {MINIMUM_PLAYERS - checkedInCount} more{' '}
              {MINIMUM_PLAYERS - checkedInCount === 1 ? 'player' : 'players'} needed
            </p>
          )}
        </div>

        {/* Check-in Button */}
        <Button
          onClick={handleToggleCheckin}
          disabled={isPending}
          variant={isCheckedIn ? 'outline' : 'default'}
          size="lg"
          className={`w-full h-14 text-lg font-medium transition-all ${
            isCheckedIn
              ? 'border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30'
              : ''
          }`}
        >
          {isPending ? (
            'Updating...'
          ) : isCheckedIn ? (
            <span className="flex items-center gap-2">
              <span className="text-xl">\u2705</span> I&apos;m Playing!
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="text-xl">\u26BD</span> Check In for Today
            </span>
          )}
        </Button>

        {isCheckedIn && (
          <p className="text-center text-sm text-muted-foreground">
            Tap again to check out if your plans change
          </p>
        )}
      </CardContent>
    </Card>
  );
}
