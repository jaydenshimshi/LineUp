'use client';

/**
 * Organization Today Client Component
 * Handles check-in toggle and status display with personalized feedback
 */

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface OrgTodayClientProps {
  orgId: string;
  orgSlug: string;
  playerId: string;
  playerName: string;
  isCheckedIn: boolean;
  checkedInCount: number;
  dateString: string;
}

const MINIMUM_PLAYERS = 6;
const PLAYERS_PER_TEAM = 7;
const THREE_TEAM_THRESHOLD = 21;

// Helper function to get player status message
function getPlayerStatusMessage(
  playerName: string,
  position: number,
  totalPlayers: number
): { message: string; subMessage: string; type: 'playing' | 'sub' | 'third_team' } {
  const firstName = playerName.split(' ')[0];
  const twoTeamCapacity = PLAYERS_PER_TEAM * 2; // 14 players
  const threeTeamCapacity = PLAYERS_PER_TEAM * 3; // 21 players

  if (totalPlayers >= THREE_TEAM_THRESHOLD && position <= threeTeamCapacity) {
    // 3 teams scenario - everyone in first 21 plays
    if (position <= PLAYERS_PER_TEAM) {
      return {
        message: `${firstName}, you're in Team 1!`,
        subMessage: 'First 7 - you\'re starting strong',
        type: 'playing'
      };
    } else if (position <= twoTeamCapacity) {
      return {
        message: `${firstName}, you're in Team 2!`,
        subMessage: 'You\'re in the lineup',
        type: 'playing'
      };
    } else {
      return {
        message: `${firstName}, you're in Team 3!`,
        subMessage: 'Third team is ready to play',
        type: 'third_team'
      };
    }
  } else if (position <= twoTeamCapacity) {
    // 2 teams - first 14 play
    if (position <= PLAYERS_PER_TEAM) {
      return {
        message: `${firstName}, you're playing!`,
        subMessage: `You're #${position} - starting lineup`,
        type: 'playing'
      };
    } else {
      return {
        message: `${firstName}, you're playing!`,
        subMessage: `You're #${position} - second team`,
        type: 'playing'
      };
    }
  } else {
    // Position > 14 - substitute
    const subsAhead = position - twoTeamCapacity - 1;
    return {
      message: `${firstName}, you're a substitute`,
      subMessage: subsAhead === 0
        ? 'First sub - you\'ll rotate in!'
        : `${subsAhead} sub${subsAhead > 1 ? 's' : ''} ahead of you`,
      type: 'sub'
    };
  }
}

export function OrgTodayClient({
  orgId,
  orgSlug,
  playerId,
  playerName,
  isCheckedIn: initialCheckedIn,
  checkedInCount: initialCount,
  dateString,
}: OrgTodayClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCheckedIn, setIsCheckedIn] = useState(initialCheckedIn);
  const [checkedInCount, setCheckedInCount] = useState(initialCount);
  const [playerPosition, setPlayerPosition] = useState<number | null>(null);
  const [showStatusCard, setShowStatusCard] = useState(false);

  const gameStatus = checkedInCount >= MINIMUM_PLAYERS ? 'game_on' : 'not_enough';
  const firstName = playerName.split(' ')[0];

  // Animation effect when check-in status changes
  useEffect(() => {
    if (isCheckedIn && playerPosition) {
      setShowStatusCard(true);
    } else {
      setShowStatusCard(false);
    }
  }, [isCheckedIn, playerPosition]);

  const handleToggleCheckin = async () => {
    const isCheckingOut = isCheckedIn;
    const newStatus = !isCheckedIn;
    const newCount = checkedInCount + (newStatus ? 1 : -1);

    // Optimistic update
    setIsCheckedIn(newStatus);
    setCheckedInCount(newCount);

    // Set player position (they're the latest to check in)
    if (newStatus) {
      setPlayerPosition(newCount);
    } else {
      setPlayerPosition(null);
    }

    try {
      let response;

      if (isCheckingOut) {
        // Check out = DELETE the record (same as check-in page)
        response = await fetch(
          `/api/checkins?playerId=${playerId}&date=${dateString}&organizationId=${orgId}`,
          { method: 'DELETE' }
        );
      } else {
        // Check in = POST/create the record
        response = await fetch('/api/checkins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId,
            date: dateString,
            status: 'checked_in',
            organizationId: orgId,
          }),
        });
      }

      if (!response.ok) {
        // Revert on error
        setIsCheckedIn(!newStatus);
        setCheckedInCount((prev) => prev + (newStatus ? -1 : 1));
        setPlayerPosition(null);
        toast.error('Failed to update check-in');
      } else {
        // Show personalized toast
        if (newStatus) {
          const status = getPlayerStatusMessage(playerName, newCount, newCount);
          toast.success(status.message, {
            description: status.subMessage,
          });
        } else {
          toast.info(`See you next time, ${firstName}!`, {
            description: 'You can always check back in',
          });
        }

        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      // Revert on error
      setIsCheckedIn(!newStatus);
      setCheckedInCount((prev) => prev + (newStatus ? -1 : 1));
      setPlayerPosition(null);
      toast.error('Something went wrong');
    }
  };

  // Get current status for display
  const currentStatus = playerPosition
    ? getPlayerStatusMessage(playerName, playerPosition, checkedInCount)
    : null;

  return (
    <Card className="overflow-hidden animate-fade-in">
      <div
        className={`h-1 transition-all duration-500 ${
          gameStatus === 'game_on'
            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
            : 'bg-gradient-to-r from-amber-500 to-orange-500'
        }`}
      />
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Today&apos;s Game</CardTitle>
          <Badge
            variant={gameStatus === 'game_on' ? 'default' : 'secondary'}
            className={`text-[10px] h-5 transition-all ${
              gameStatus === 'game_on'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
            }`}
          >
            {gameStatus === 'game_on' ? 'Game On!' : 'Need More'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        {/* Player Count - Compact */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold tabular-nums">{checkedInCount}</p>
            <p className="text-[10px] text-muted-foreground">
              {checkedInCount === 1 ? 'player' : 'players'} in
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Min</p>
            <p className="text-sm font-medium">{MINIMUM_PLAYERS}</p>
          </div>
        </div>

        {/* Progress Bar - Thinner */}
        <div className="space-y-1">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ease-out rounded-full ${
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
            <p className="text-[10px] text-muted-foreground text-center">
              {MINIMUM_PLAYERS - checkedInCount} more needed
            </p>
          )}
        </div>

        {/* Personalized Status Card - Compact */}
        {isCheckedIn && currentStatus && (
          <div
            className={`p-2 rounded-lg border transition-all duration-500 animate-scale-in ${
              currentStatus.type === 'playing'
                ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                : currentStatus.type === 'third_team'
                ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800'
                : 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  currentStatus.type === 'playing'
                    ? 'bg-green-200 dark:bg-green-800'
                    : currentStatus.type === 'third_team'
                    ? 'bg-yellow-200 dark:bg-yellow-800'
                    : 'bg-blue-200 dark:bg-blue-800'
                }`}
              >
                {currentStatus.type === 'playing' ? '⚽' : currentStatus.type === 'third_team' ? '🎯' : '🔄'}
              </div>
              <div>
                <p className="text-xs font-medium">{currentStatus.message}</p>
                <p className="text-[10px] text-muted-foreground">{currentStatus.subMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Check-in Button - Compact */}
        <Button
          onClick={handleToggleCheckin}
          disabled={isPending}
          variant={isCheckedIn ? 'outline' : 'default'}
          className={`w-full h-10 text-sm font-medium transition-all btn-press ${
            isCheckedIn
              ? 'border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30'
              : 'hover:scale-[1.02]'
          }`}
        >
          {isPending ? (
            <span className="flex items-center gap-1.5">
              <span className="animate-spin text-sm">⏳</span> Updating...
            </span>
          ) : isCheckedIn ? (
            <span className="flex items-center gap-1.5">
              <span className="text-sm">✅</span> {firstName}, You&apos;re In!
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="text-sm">⚽</span> Check In, {firstName}
            </span>
          )}
        </Button>

        {isCheckedIn && (
          <p className="text-center text-[10px] text-muted-foreground animate-fade-in">
            Tap to check out if plans change
          </p>
        )}
      </CardContent>
    </Card>
  );
}
