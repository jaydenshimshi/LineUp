'use client';

/**
 * Check-in Client Component
 * Beautiful calendar UI for marking availability with real-time updates
 */

import { useState, useTransition, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays, isSameDay, isToday, isPast, setHours, setMinutes } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { useRealtimeCheckinCounts } from '@/hooks/use-realtime-checkin-counts';
import { toast } from 'sonner';

interface CheckedInPlayer {
  id: string;
  name: string;
  position: string;
  isAdmin: boolean;
  role: string;
  checkinOrder: number;
  contact: {
    email: string | null;
    phone: string | null;
  } | null;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  urgency: 'info' | 'important';
  scope_type: 'global' | 'date';
  scope_date: string | null;
}

interface CheckinClientProps {
  orgId: string;
  orgSlug: string;
  playerId: string;
  playerName: string;
  initialCheckins: Record<string, 'checked_in' | 'checked_out'>;
  checkinCounts: Record<string, number>;
  announcements?: Announcement[];
}

export function CheckinClient({
  orgId,
  playerId,
  initialCheckins,
  checkinCounts: initialCounts,
  announcements = [],
}: CheckinClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [checkins, setCheckins] = useState(initialCheckins);
  const [loadingDate, setLoadingDate] = useState<string | null>(null);

  // Player list drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [checkedInPlayers, setCheckedInPlayers] = useState<CheckedInPlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  const today = new Date();

  // Sync local state when initialCheckins prop changes (e.g., after navigation)
  useEffect(() => {
    setCheckins(initialCheckins);
  }, [initialCheckins]);

  // Refetch checkins when component mounts or window regains focus
  const refetchCheckins = useCallback(async () => {
    try {
      const startDate = format(today, 'yyyy-MM-dd');
      const endDate = format(addDays(today, 13), 'yyyy-MM-dd');

      const response = await fetch(
        `/api/checkins/player?playerId=${playerId}&organizationId=${orgId}&startDate=${startDate}&endDate=${endDate}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.checkins) {
          const checkinMap: Record<string, 'checked_in' | 'checked_out'> = {};
          data.checkins.forEach((c: { date: string; status: string }) => {
            checkinMap[c.date] = c.status as 'checked_in' | 'checked_out';
          });
          setCheckins(checkinMap);
        }
      }
    } catch (error) {
      console.error('Failed to refetch checkins:', error);
    }
  }, [playerId, orgId, today]);

  // Game cutoff time - games are in the morning, so after 10 AM check-ins are for next day
  const GAME_CUTOFF_HOUR = 10;

  // Check if a date's game has already passed (past days, or today after cutoff)
  const isGamePast = (date: Date): boolean => {
    const now = new Date();

    // If it's a past day (not today), it's definitely past
    if (isPast(date) && !isToday(date)) {
      return true;
    }

    // If it's today and we're past the cutoff time, game has happened
    if (isToday(date) && now.getHours() >= GAME_CUTOFF_HOUR) {
      return true;
    }

    return false;
  };

  // Generate 14 days starting from today
  const days = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < 14; i++) {
      result.push(addDays(today, i));
    }
    return result;
  }, []);

  // Date strings for real-time hook
  const dateStrings = useMemo(
    () => days.map((d) => format(d, 'yyyy-MM-dd')),
    [days]
  );

  // Real-time check-in counts
  const { counts: checkinCounts, refetch: refetchCounts } = useRealtimeCheckinCounts({
    organizationId: orgId,
    dates: dateStrings,
    initialCounts: initialCounts,
  });

  // Refetch on window focus (when user returns to the tab/app)
  useEffect(() => {
    const handleFocus = () => {
      refetchCheckins();
      refetchCounts();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchCheckins, refetchCounts]);

  // Split into weeks
  const thisWeek = days.slice(0, 7);
  const nextWeek = days.slice(7, 14);

  // Fetch checked-in players for a specific date
  const fetchCheckedInPlayers = async (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    setLoadingPlayers(true);
    setSelectedDate(date);
    setDrawerOpen(true);

    try {
      const response = await fetch(
        `/api/checkins/players?date=${dateString}&organizationId=${orgId}`
      );
      if (response.ok) {
        const data = await response.json();
        setCheckedInPlayers(data.players || []);
      } else {
        toast.error('Failed to load players');
        setCheckedInPlayers([]);
      }
    } catch {
      toast.error('Something went wrong');
      setCheckedInPlayers([]);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleToggleCheckin = async (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    setLoadingDate(dateString);

    const currentStatus = checkins[dateString];
    const isCheckingOut = currentStatus === 'checked_in';

    try {
      let response;

      if (isCheckingOut) {
        // Check out = DELETE the record
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
            playerId: playerId,
            organizationId: orgId,
            date: dateString,
            status: 'checked_in',
          }),
        });
      }

      if (response.ok) {
        // Update local state
        if (isCheckingOut) {
          setCheckins((prev) => {
            const newCheckins = { ...prev };
            delete newCheckins[dateString];
            return newCheckins;
          });
        } else {
          setCheckins((prev) => ({
            ...prev,
            [dateString]: 'checked_in',
          }));
        }

        // Immediately refetch counts to update the badge
        refetchCounts();

        // Show toast notification
        if (!isCheckingOut) {
          toast.success(`You're in for ${format(date, 'EEEE, MMM d')}!`, {
            description: 'Other players can see you\'re coming',
          });
        } else {
          toast.info(`Checked out of ${format(date, 'EEEE, MMM d')}`, {
            description: 'You can always check back in',
          });
        }

        startTransition(() => {
          router.refresh();
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Check-in error:', errorData);
        toast.error('Failed to update check-in');
      }
    } catch (error) {
      console.error('Failed to update check-in:', error);
      toast.error('Something went wrong');
    } finally {
      setLoadingDate(null);
    }
  };

  const DayCard = ({ date }: { date: Date }) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const status = checkins[dateString];
    const isCheckedIn = status === 'checked_in';
    const count = checkinCounts[dateString] || 0;
    const isPastDay = isGamePast(date);
    const isTodayDate = isToday(date);
    const isTodayButPast = isTodayDate && isPastDay; // Today but after cutoff

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      if (!isPastDay) {
        handleToggleCheckin(date);
      }
    };

    const handleViewPlayers = (e: React.MouseEvent) => {
      e.stopPropagation();
      fetchCheckedInPlayers(date);
    };

    return (
      <div
        className={cn(
          'relative flex flex-col items-center p-1.5 rounded-lg border transition-all',
          isPastDay && 'opacity-50',
          isCheckedIn
            ? 'border-primary bg-primary/10'
            : 'border-border bg-card',
          isTodayDate && !isCheckedIn && !isPastDay && 'border-primary/50 ring-1 ring-primary/20',
          loadingDate === dateString && 'animate-pulse'
        )}
      >
        {/* Clickable area for check-in toggle */}
        <button
          onClick={handleClick}
          disabled={isPastDay || loadingDate === dateString}
          className={cn(
            'flex flex-col items-center w-full',
            !isPastDay && 'active:scale-95 transition-transform cursor-pointer',
            isPastDay && 'cursor-not-allowed'
          )}
        >
          {/* Day name */}
          <span className="text-[9px] font-medium text-muted-foreground uppercase">
            {format(date, 'EEE')}
          </span>

          {/* Date number */}
          <span
            className={cn(
              'text-sm font-bold',
              isCheckedIn ? 'text-primary' : 'text-foreground',
              isTodayDate && !isPastDay && 'text-primary'
            )}
          >
            {format(date, 'd')}
          </span>

          {/* Status indicator */}
          <div className="mt-0.5">
            {isCheckedIn ? (
              <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-4 h-4 rounded-full border border-muted-foreground/30" />
            )}
          </div>
        </button>

        {/* Player count badge - clickable to view players */}
        {count > 0 && (
          <button
            onClick={handleViewPlayers}
            className={cn(
              'absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center text-[9px] px-1 rounded-full font-medium transition-transform hover:scale-110',
              count >= 6
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-secondary text-secondary-foreground'
            )}
            title="Tap to see who's playing"
          >
            {count}
          </button>
        )}

        {/* Today indicator */}
        {isTodayDate && (
          <span className={cn(
            "absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-medium",
            isTodayButPast ? "text-muted-foreground" : "text-primary"
          )}>
            {isTodayButPast ? 'Played' : 'Today'}
          </span>
        )}
      </div>
    );
  };

  const checkedInDays = Object.values(checkins).filter((s) => s === 'checked_in').length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-3 px-3 max-w-lg">
        {/* Header - Compact */}
        <div className="mb-3">
          <h1 className="text-base font-semibold">Weekly Check-in</h1>
          <p className="text-[11px] text-muted-foreground">
            Tap days you&apos;re available
          </p>
        </div>

        {/* Announcements - Compact */}
        {announcements.length > 0 && (
          <div className="mb-3 space-y-2">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={cn(
                  'p-2 rounded-lg border',
                  announcement.urgency === 'important'
                    ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
                    : 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800'
                )}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={cn(
                      'w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                      announcement.urgency === 'important'
                        ? 'bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200'
                        : 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                    )}
                  >
                    {announcement.urgency === 'important' ? '!' : 'i'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <h3 className="font-medium text-[11px] truncate">{announcement.title}</h3>
                      {announcement.scope_type === 'date' && announcement.scope_date && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1">
                          {format(new Date(announcement.scope_date), 'MMM d')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">
                      {announcement.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats - Compact */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-2 text-center">
              <p className="text-xl font-bold text-primary">{checkedInDays}</p>
              <p className="text-[10px] text-muted-foreground">Days in</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 text-center">
              <p className="text-xl font-bold">{14 - checkedInDays}</p>
              <p className="text-[10px] text-muted-foreground">Available</p>
            </CardContent>
          </Card>
        </div>

        {/* This Week - Compact */}
        <Card className="mb-3">
          <CardHeader className="p-2 pb-1">
            <CardTitle className="text-xs font-medium flex items-center gap-1">
              <span className="text-sm">📅</span>
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="grid grid-cols-7 gap-1">
              {thisWeek.map((date) => (
                <DayCard key={date.toISOString()} date={date} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Next Week - Compact */}
        <Card className="mb-3">
          <CardHeader className="p-2 pb-1">
            <CardTitle className="text-xs font-medium flex items-center gap-1">
              <span className="text-sm">📆</span>
              Next Week
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="grid grid-cols-7 gap-1">
              {nextWeek.map((date) => (
                <DayCard key={date.toISOString()} date={date} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Legend - Compact */}
        <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span>In</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full border border-muted-foreground/30" />
            <span>Out</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[9px] h-4 px-1">
              6+
            </Badge>
            <span>Game on</span>
          </div>
        </div>

        {/* Tips - Compact */}
        <div className="mt-3 p-2 bg-muted/30 rounded-lg">
          <p className="text-[10px] text-center text-muted-foreground">
            Tap badge to see who&apos;s playing
          </p>
        </div>
      </div>

      {/* Player List Drawer - Compact */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader className="text-left p-3 pb-2">
            <DrawerTitle className="flex items-center gap-1.5 text-sm">
              <span className="text-base">👥</span>
              {selectedDate && format(selectedDate, 'EEE, MMM d')}
            </DrawerTitle>
            <DrawerDescription className="text-[11px]">
              {loadingPlayers
                ? 'Loading...'
                : `${checkedInPlayers.length} player${checkedInPlayers.length !== 1 ? 's' : ''} in`}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-3 pb-4 max-h-[50vh] overflow-y-auto">
            {loadingPlayers ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-muted" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 bg-muted rounded w-1/3" />
                      <div className="h-2 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : checkedInPlayers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-xs">No players yet</p>
                <p className="text-[10px] mt-0.5">Be the first!</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {checkedInPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border"
                  >
                    {/* Avatar with order number */}
                    <div className="relative">
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium',
                        player.checkinOrder <= 14
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      )}>
                        {player.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className={cn(
                        'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center',
                        player.checkinOrder <= 14
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-500 text-white'
                      )}>
                        {player.checkinOrder}
                      </span>
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-medium truncate">{player.name}</p>
                        {player.isAdmin && (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[8px] px-1 h-3.5">
                            {player.role === 'owner' ? 'Owner' : 'Admin'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">
                          {player.position}
                        </Badge>
                        {player.checkinOrder <= 14 ? (
                          <span className="text-green-600 dark:text-green-400 text-[9px]">Playing</span>
                        ) : (
                          <span className="text-blue-600 dark:text-blue-400 text-[9px]">Sub</span>
                        )}
                      </div>
                    </div>

                    {/* Contact Info (if shared) */}
                    {player.contact && (player.contact.email || player.contact.phone) && (
                      <div className="flex gap-0.5">
                        {player.contact.phone && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => window.open(`tel:${player.contact?.phone}`, '_self')}
                            title={player.contact.phone}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </Button>
                        )}
                        {player.contact.email && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => window.open(`mailto:${player.contact?.email}`, '_self')}
                            title={player.contact.email}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Summary */}
                <div className="mt-2 p-2 rounded-lg bg-muted/50 text-center text-[10px] text-muted-foreground">
                  {checkedInPlayers.length >= 14 ? (
                    <p>Full teams! First 14 play, rest are subs.</p>
                  ) : checkedInPlayers.length >= 6 ? (
                    <p>Game on! {14 - checkedInPlayers.length} spots left.</p>
                  ) : (
                    <p>Need {6 - checkedInPlayers.length} more for a game.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
