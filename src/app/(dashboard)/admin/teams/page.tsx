/**
 * Admin Teams page - Team generation and management
 */

import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { TeamsClient } from './teams-client';
import type { Metadata } from 'next';
import type { CheckedInPlayer } from '@/types/team-generation';

export const metadata: Metadata = {
  title: 'Team Generator - Admin',
  description: 'Generate and manage teams',
};

interface PlayerWithRating {
  id: string;
  full_name: string;
  age: number;
  main_position: string;
  alt_position: string | null;
  player_admin_ratings: { rating_stars: number }[] | null;
}

interface CheckinRow {
  player_id: string;
  status: string;
  players: PlayerWithRating;
}

export default async function TeamsPage() {
  const supabase = await createClient();
  const today = new Date();
  const todayString = format(today, 'yyyy-MM-dd');

  // Get current admin user
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // Get today's check-ins with player data and ratings
  const { data: checkinsData } = await supabase
    .from('checkins')
    .select(`
      player_id,
      status,
      players!inner(
        id,
        full_name,
        age,
        main_position,
        alt_position,
        player_admin_ratings(rating_stars)
      )
    `)
    .eq('date', todayString)
    .eq('status', 'checked_in');

  const checkins = (checkinsData || []) as unknown as CheckinRow[];

  const checkedInPlayers: CheckedInPlayer[] = checkins.map((c) => ({
    id: c.player_id,
    playerId: c.players.id,
    name: c.players.full_name,
    age: c.players.age,
    mainPosition: c.players.main_position as CheckedInPlayer['mainPosition'],
    altPosition: c.players.alt_position as CheckedInPlayer['altPosition'],
    rating: c.players.player_admin_ratings?.[0]?.rating_stars || 3,
    checkinStatus: c.status as 'checked_in' | 'checked_out',
  }));

  // Get existing team run for today if any
  const { data: teamRunData } = await supabase
    .from('team_runs')
    .select('*')
    .eq('date', todayString)
    .single();

  // Audit log is managed client-side
  const auditLog: Array<{ id: string; action: string; details: string; timestamp: Date }> = [];

  return (
    <TeamsClient
      initialDate={today}
      initialPlayers={checkedInPlayers}
      existingTeamRun={teamRunData}
      adminId={authUser?.id || ''}
      auditLog={auditLog}
    />
  );
}
