/**
 * Attendance History Page
 * Shows player's historical attendance data
 */

import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { AttendanceClient } from './attendance-client';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Attendance History - Lineup',
  description: 'View your attendance history',
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface CheckinRecord {
  date: string;
  status: string;
  created_at: string;
}

interface TeamAssignmentRecord {
  team_color: string;
  team_runs: {
    date: string;
  };
}

export default async function AttendancePage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get organization using admin client to bypass RLS
  const { data: org } = await adminSupabase
    .from('organizations')
    .select('id, name')
    .eq('slug', slug)
    .single();

  if (!org) {
    redirect('/organizations');
  }

  const orgData = org as { id: string; name: string };

  // Verify user is a member using admin client
  const { data: membership } = await adminSupabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('organization_id', orgData.id)
    .single();

  if (!membership) {
    redirect('/organizations');
  }

  // Get player profile using admin client
  const { data: player } = await adminSupabase
    .from('players')
    .select('id, full_name, created_at')
    .eq('user_id', user.id)
    .eq('organization_id', orgData.id)
    .single();

  if (!player) {
    redirect(`/org/${slug}/profile`);
  }

  const playerData = player as {
    id: string;
    full_name: string;
    created_at: string;
  };

  // Get all check-ins for this player (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: checkinsData } = await adminSupabase
    .from('checkins')
    .select('date, status, created_at')
    .eq('player_id', playerData.id)
    .eq('organization_id', orgData.id)
    .gte('date', sixMonthsAgo.toISOString().split('T')[0])
    .order('date', { ascending: false });

  const checkins = (checkinsData || []) as CheckinRecord[];

  // Get team assignments to see which games the player was assigned to
  const { data: assignmentsData } = await adminSupabase
    .from('team_assignments')
    .select(`
      team_color,
      team_runs (
        date
      )
    `)
    .eq('player_id', playerData.id)
    .gte('created_at', sixMonthsAgo.toISOString());

  const assignments = (assignmentsData || []) as TeamAssignmentRecord[];

  // Calculate stats
  const checkedInDates = checkins
    .filter((c) => c.status === 'checked_in')
    .map((c) => c.date);

  const totalCheckins = checkedInDates.length;

  // Get total games that happened (team runs with published/locked status)
  const { count: totalGamesCount } = await adminSupabase
    .from('team_runs')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgData.id)
    .in('status', ['published', 'locked'])
    .gte('date', sixMonthsAgo.toISOString().split('T')[0])
    .lte('date', new Date().toISOString().split('T')[0]);

  const totalGames = totalGamesCount || 0;

  // Calculate attendance rate
  const attendanceRate = totalGames > 0 ? Math.round((totalCheckins / totalGames) * 100) : 0;

  // Calculate current streak
  let currentStreak = 0;
  const sortedDates = [...checkedInDates].sort().reverse();
  const today = new Date().toISOString().split('T')[0];

  for (const date of sortedDates) {
    if (date <= today) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Group checkins by month for display
  const checkinsByMonth: Record<string, CheckinRecord[]> = {};
  checkins.forEach((checkin) => {
    const month = checkin.date.substring(0, 7); // YYYY-MM
    if (!checkinsByMonth[month]) {
      checkinsByMonth[month] = [];
    }
    checkinsByMonth[month].push(checkin);
  });

  // Get games played (from team assignments)
  const gamesPlayed = assignments.length;

  return (
    <AttendanceClient
      playerName={playerData.full_name}
      memberSince={playerData.created_at}
      stats={{
        totalCheckins,
        totalGames,
        attendanceRate,
        currentStreak,
        gamesPlayed,
      }}
      checkinsByMonth={checkinsByMonth}
    />
  );
}
