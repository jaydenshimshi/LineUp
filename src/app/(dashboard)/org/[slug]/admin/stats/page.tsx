/**
 * Player Stats Dashboard
 * Admin view of all player statistics
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StatsClient } from './stats-client';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Player Stats - Lineup',
  description: 'View player statistics and analytics',
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface PlayerRecord {
  id: string;
  full_name: string;
  main_position: string;
  skill_level: number | null;
  created_at: string;
}

interface CheckinRecord {
  player_id: string;
  status: string;
}

interface TeamAssignmentRecord {
  player_id: string;
  team_color: string;
}

export default async function StatsPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get organization
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('slug', slug)
    .single();

  if (!org) {
    redirect('/organizations');
  }

  const orgData = org as { id: string; name: string };

  // Check if user is admin
  const { data: membershipData } = await supabase
    .from('memberships')
    .select('role')
    .eq('organization_id', orgData.id)
    .eq('user_id', user.id)
    .single();

  const membership = membershipData as { role: string } | null;
  if (!membership || !['admin', 'owner'].includes(membership.role)) {
    redirect(`/org/${slug}`);
  }

  // Get all players
  const { data: playersData } = await supabase
    .from('players')
    .select('id, full_name, main_position, skill_level, created_at')
    .eq('organization_id', orgData.id)
    .order('full_name');

  const players = (playersData || []) as PlayerRecord[];

  // Get check-ins from last 3 months
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { data: checkinsData } = await supabase
    .from('checkins')
    .select('player_id, status')
    .eq('organization_id', orgData.id)
    .eq('status', 'checked_in')
    .gte('date', threeMonthsAgo.toISOString().split('T')[0]);

  const checkins = (checkinsData || []) as CheckinRecord[];

  // Get team assignments from last 3 months
  const { data: assignmentsData } = await supabase
    .from('team_assignments')
    .select('player_id, team_color')
    .in(
      'player_id',
      players.map((p) => p.id)
    )
    .gte('created_at', threeMonthsAgo.toISOString());

  const assignments = (assignmentsData || []) as TeamAssignmentRecord[];

  // Get total games in the period
  const { count: totalGamesCount } = await supabase
    .from('team_runs')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgData.id)
    .in('status', ['published', 'locked'])
    .gte('date', threeMonthsAgo.toISOString().split('T')[0])
    .lte('date', new Date().toISOString().split('T')[0]);

  const totalGames = totalGamesCount || 0;

  // Build player stats
  const playerStats = players.map((player) => {
    const playerCheckins = checkins.filter((c) => c.player_id === player.id);
    const playerAssignments = assignments.filter((a) => a.player_id === player.id);

    const attendanceCount = playerCheckins.length;
    const attendanceRate = totalGames > 0 ? Math.round((attendanceCount / totalGames) * 100) : 0;
    const gamesPlayed = playerAssignments.length;

    return {
      id: player.id,
      name: player.full_name,
      position: player.main_position,
      skillLevel: player.skill_level,
      memberSince: player.created_at,
      attendanceCount,
      attendanceRate,
      gamesPlayed,
    };
  });

  // Calculate org-wide stats
  const orgStats = {
    totalPlayers: players.length,
    totalGames,
    avgAttendance:
      players.length > 0
        ? Math.round(playerStats.reduce((sum, p) => sum + p.attendanceRate, 0) / players.length)
        : 0,
    topAttendees: [...playerStats]
      .sort((a, b) => b.attendanceRate - a.attendanceRate)
      .slice(0, 5),
  };

  return (
    <StatsClient
      orgName={orgData.name}
      playerStats={playerStats}
      orgStats={orgStats}
    />
  );
}
