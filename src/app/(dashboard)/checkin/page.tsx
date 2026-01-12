/**
 * Check-in page - Weekly calendar for player check-ins
 */

import { redirect } from 'next/navigation';
import { format, startOfWeek, addDays } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { WeekCalendar } from '@/components/checkin/week-calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Metadata } from 'next';
import type { Player, Announcement } from '@/types';

export const metadata: Metadata = {
  title: 'Weekly Check-in',
  description: 'Check in for upcoming games',
};

interface CheckinRow {
  date: string;
  status: string;
}

export default async function CheckinPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // Get player profile
  const { data: playerData } = await (supabase
    .from('players')
    .select('*') as any)
    .eq('user_id', authUser.id)
    .single();
  const player = playerData as Player | null;

  // Redirect to profile if not completed
  if (!player || !player.profile_completed) {
    redirect('/profile');
  }

  // Get current week dates
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDates = Array.from({ length: 7 }, (_, i) =>
    format(addDays(weekStart, i), 'yyyy-MM-dd')
  );

  // Get player's check-ins for this week
  const { data: playerCheckinsData } = await (supabase
    .from('checkins')
    .select('date, status') as any)
    .eq('player_id', player.id)
    .in('date', weekDates);
  const playerCheckins = (playerCheckinsData || []) as CheckinRow[];

  // Get total check-in counts for each day
  const dayCounts: Record<string, number> = {};
  for (const date of weekDates) {
    const { count } = await (supabase
      .from('checkins')
      .select('*', { count: 'exact', head: true }) as any)
      .eq('date', date)
      .eq('status', 'checked_in');
    dayCounts[date] = count || 0;
  }

  // Build initial checkins data
  const initialCheckins = weekDates.map((date) => ({
    date,
    isCheckedIn: playerCheckins.some(
      (c) => c.date === date && c.status === 'checked_in'
    ),
    totalCount: dayCounts[date] || 0,
  }));

  // Get date-specific announcements for this week
  const { data: announcementsData } = await supabase
    .from('announcements')
    .select('*')
    .eq('is_active', true)
    .eq('scope_type', 'date_specific')
    .in('scope_date', weekDates)
    .order('urgency', { ascending: false });
  const announcements = (announcementsData || []) as Announcement[];

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Weekly Check-in</h1>
        <p className="text-gray-500 mt-1">
          Toggle your availability for each game day
        </p>
      </div>

      {/* Date-specific announcements */}
      {announcements.length > 0 && (
        <div className="mb-6 space-y-2">
          {announcements.map((announcement) => (
            <Alert
              key={announcement.id}
              variant={announcement.urgency === 'important' ? 'destructive' : 'default'}
            >
              <AlertDescription>
                <span className="font-medium">
                  {format(new Date(announcement.scope_date!), 'EEE, MMM d')}:
                </span>{' '}
                {announcement.title} - {announcement.body}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Week Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <WeekCalendar playerId={player.id} initialCheckins={initialCheckins} />
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <h3 className="font-medium mb-2">How it works</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Click &quot;Not Playing&quot; to check in for a game day</li>
            <li>• Click &quot;Playing&quot; again to check out if plans change</li>
            <li>• Games require at least 6 players to proceed</li>
            <li>• Check-in counts update in real-time</li>
            <li>• Past days cannot be modified</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
