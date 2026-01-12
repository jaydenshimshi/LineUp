/**
 * Admin Dashboard Overview
 * Central hub for organization admins
 * Uses session date (6 AM cutoff)
 */

import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getSessionDate } from '@/lib/session-date';
import { AdminDashboardClient } from './admin-dashboard-client';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Lineup',
  description: 'Manage your organization',
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function AdminDashboardPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Use session date (6 AM cutoff) for all data
  const { sessionDateString, displayLabel } = getSessionDate();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Use admin client to bypass RLS
  const adminSupabase = createAdminClient();

  // Get organization
  const { data: org } = await adminSupabase
    .from('organizations')
    .select('id, name, slug, created_at')
    .eq('slug', slug)
    .single();

  if (!org) {
    redirect('/organizations');
  }

  const orgData = org as { id: string; name: string; slug: string; created_at: string };

  // Check admin access
  const { data: membership } = await adminSupabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('organization_id', orgData.id)
    .single();

  const role = (membership as { role: string } | null)?.role;
  if (!role || !['admin', 'owner'].includes(role)) {
    redirect(`/org/${slug}`);
  }

  // Get stats
  const { count: memberCount } = await adminSupabase
    .from('memberships')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgData.id);

  // Count only players with user accounts (not admin-created players)
  const { count: playerCount } = await adminSupabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgData.id)
    .eq('profile_completed', true)
    .not('user_id', 'is', null);

  // Count admin-created players separately
  const { count: manualPlayerCount } = await adminSupabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgData.id)
    .eq('profile_completed', true)
    .is('user_id', null);

  const { count: todayCheckins } = await adminSupabase
    .from('checkins')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgData.id)
    .eq('date', sessionDateString)
    .eq('status', 'checked_in');

  // Count only players rated by the current admin (not all admins)
  const { count: ratedPlayers } = await adminSupabase
    .from('player_admin_ratings')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgData.id)
    .eq('rated_by_admin_id', user.id);

  // Get today's team run with assignments
  const { data: teamRunData } = await adminSupabase
    .from('team_runs')
    .select(`
      id,
      status,
      team_assignments (
        id,
        team_color,
        assigned_role,
        player_id,
        players (
          id,
          full_name,
          main_position
        )
      )
    `)
    .eq('organization_id', orgData.id)
    .eq('date', sessionDateString)
    .single();

  interface TeamAssignment {
    id: string;
    team_color: string;
    assigned_role: string | null;
    player_id: string;
    players: {
      id: string;
      full_name: string;
      main_position: string;
    };
  }

  interface TeamRun {
    id: string;
    status: string;
    team_assignments: TeamAssignment[];
  }

  const existingTeamRun = teamRunData as TeamRun | null;
  const teamStatus = existingTeamRun?.status || 'none';

  // Get active announcements count
  const { count: activeAnnouncements } = await adminSupabase
    .from('announcements')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgData.id)
    .eq('is_active', true);

  // Get checked-in players for today with their ratings (for team generation)
  const { data: checkinsData } = await adminSupabase
    .from('checkins')
    .select(`
      player_id,
      players (
        id,
        full_name,
        age,
        main_position,
        alt_position
      )
    `)
    .eq('organization_id', orgData.id)
    .eq('date', sessionDateString)
    .eq('status', 'checked_in');

  interface CheckinWithPlayer {
    player_id: string;
    players: {
      id: string;
      full_name: string;
      age: number;
      main_position: string;
      alt_position: string | null;
    };
  }

  const checkins = (checkinsData || []) as CheckinWithPlayer[];
  const playerIds = checkins.map((c) => c.player_id);

  // Get ratings for checked-in players
  const { data: ratingsData } = await adminSupabase
    .from('player_admin_ratings')
    .select('player_id, rating_stars')
    .eq('organization_id', orgData.id)
    .in('player_id', playerIds.length > 0 ? playerIds : ['none']);

  interface Rating {
    player_id: string;
    rating_stars: number;
  }

  const ratings = (ratingsData || []) as Rating[];
  const ratingsMap: Record<string, number> = {};
  ratings.forEach((r) => {
    ratingsMap[r.player_id] = r.rating_stars;
  });

  // Combine players with ratings
  const checkedInPlayers = checkins.map((c) => ({
    ...c.players,
    rating: ratingsMap[c.player_id] || 3,
  }));

  return (
    <AdminDashboardClient
      orgId={orgData.id}
      orgSlug={slug}
      orgName={orgData.name}
      orgCreatedAt={orgData.created_at}
      role={role}
      memberCount={memberCount || 0}
      playerCount={playerCount || 0}
      manualPlayerCount={manualPlayerCount || 0}
      todayCheckins={todayCheckins || 0}
      ratedPlayers={ratedPlayers || 0}
      teamStatus={teamStatus}
      activeAnnouncements={activeAnnouncements || 0}
      existingTeamRun={existingTeamRun}
      checkedInPlayers={checkedInPlayers}
      sessionDate={sessionDateString}
      sessionLabel={displayLabel}
    />
  );
}
