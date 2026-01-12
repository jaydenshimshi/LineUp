/**
 * Teams View Page
 * Display published team assignments
 */

import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { TeamsViewClient } from './teams-view-client';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Teams - Lineup',
  description: 'View team assignments',
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface TeamAssignment {
  id: string;
  team_color: 'red' | 'blue' | 'yellow' | 'sub';
  assigned_role: string | null;
  players: {
    id: string;
    full_name: string;
    main_position: string;
    alt_position: string | null;
  };
}

interface TeamRun {
  id: string;
  date: string;
  status: string;
  team_assignments: TeamAssignment[];
}

export default async function TeamsPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const today = format(new Date(), 'yyyy-MM-dd');

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

  // Verify user is a member of this organization using admin client
  const { data: membership } = await adminSupabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('organization_id', orgData.id)
    .single();

  if (!membership) {
    redirect('/organizations');
  }

  // Get today's team run with assignments
  const { data: teamRunsArray, error: teamRunError } = await adminSupabase
    .from('team_runs')
    .select(`
      id,
      date,
      status,
      team_assignments (
        id,
        team_color,
        assigned_role,
        players (
          id,
          full_name,
          main_position,
          alt_position
        )
      )
    `)
    .eq('organization_id', orgData.id)
    .eq('date', today)
    .in('status', ['published', 'locked'])
    .order('created_at', { ascending: false })
    .limit(1);

  // Get the first (most recent) team run if any
  const teamRun = (teamRunsArray && teamRunsArray.length > 0 ? teamRunsArray[0] : null) as TeamRun | null;

  // Position order: GK first, then DF, MID, ST
  const positionOrder: Record<string, number> = {
    'GK': 1,
    'DF': 2,
    'MID': 3,
    'ST': 4,
  };

  const sortByPosition = (a: TeamAssignment, b: TeamAssignment) => {
    const posA = positionOrder[a.players.main_position] || 5;
    const posB = positionOrder[b.players.main_position] || 5;
    return posA - posB;
  };

  // Group assignments by team
  const teams: Record<string, TeamAssignment[]> = {
    red: [],
    blue: [],
    yellow: [],
    sub: [],
  };

  if (teamRun?.team_assignments) {
    teamRun.team_assignments.forEach((assignment) => {
      if (teams[assignment.team_color]) {
        teams[assignment.team_color].push(assignment);
      }
    });

    // Sort each team by position
    Object.keys(teams).forEach((color) => {
      teams[color].sort(sortByPosition);
    });
  }

  const hasTeams = teamRun && Object.values(teams).some((t) => t.length > 0);

  return (
    <TeamsViewClient
      orgName={orgData.name}
      teams={teams}
      hasTeams={!!hasTeams}
      dateString={teamRun?.date || today}
    />
  );
}
