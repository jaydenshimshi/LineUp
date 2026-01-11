/**
 * Admin Teams Generation Page
 * Generate and manage balanced teams
 */

import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { TeamsClient } from './teams-client';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Generate Teams - Admin',
  description: 'Generate balanced teams',
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function AdminTeamsPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get organization
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', slug)
    .single();

  if (!org) {
    redirect('/organizations');
  }

  const orgData = org as { id: string; name: string; slug: string };

  // Check admin access
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('organization_id', orgData.id)
    .single();

  const role = (membership as { role: string } | null)?.role;
  if (!role || !['admin', 'owner'].includes(role)) {
    redirect(`/org/${slug}`);
  }

  // Get checked-in players for today with their ratings
  const { data: checkinsData } = await supabase
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
    .eq('date', today)
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
  const { data: ratingsData } = await supabase
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
    rating: ratingsMap[c.player_id] || 3, // Default to 3 if no rating
  }));

  // Get existing team run for today
  const { data: teamRunData } = await supabase
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
    .eq('date', today)
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

  return (
    <TeamsClient
      orgId={orgData.id}
      orgSlug={slug}
      date={today}
      checkedInPlayers={checkedInPlayers}
      existingTeamRun={existingTeamRun}
      adminId={user.id}
    />
  );
}
