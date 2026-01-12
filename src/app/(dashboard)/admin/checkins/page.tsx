/**
 * Admin Check-ins page - Manage player check-ins
 */

import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { CheckinsClient } from './checkins-client';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Check-ins - Admin',
  description: 'Manage player check-ins',
};

interface PlayerCheckin {
  id: string;
  playerId: string;
  playerName: string;
  mainPosition: string;
  altPosition: string | null;
  status: 'checked_in' | 'checked_out';
  checkinTime: string;
}

interface CheckinWithPlayer {
  id: string;
  player_id: string;
  status: string;
  created_at: string;
  players: {
    id: string;
    full_name: string;
    main_position: string;
    alt_position: string | null;
  };
}

interface AllPlayer {
  id: string;
  full_name: string;
  main_position: string;
  alt_position: string | null;
}

export default async function AdminCheckinsPage() {
  const supabase = await createClient();
  const today = new Date();
  const todayString = format(today, 'yyyy-MM-dd');

  // Get today's check-ins with player details
  const { data: checkinsData } = await (supabase
    .from('checkins')
    .select(`
      id,
      player_id,
      status,
      created_at,
      players!inner(id, full_name, main_position, alt_position)
    `) as any)
    .eq('date', todayString)
    .order('created_at', { ascending: false });

  const checkins = (checkinsData || []) as unknown as CheckinWithPlayer[];

  const playerCheckins: PlayerCheckin[] = checkins.map((c) => ({
    id: c.id,
    playerId: c.players.id,
    playerName: c.players.full_name,
    mainPosition: c.players.main_position,
    altPosition: c.players.alt_position,
    status: c.status as 'checked_in' | 'checked_out',
    checkinTime: c.created_at,
  }));

  // Get all players for manual check-in dropdown
  const { data: allPlayersData } = await (supabase
    .from('players')
    .select('id, full_name, main_position, alt_position') as any)
    .eq('profile_completed', true)
    .order('full_name');

  const allPlayers = (allPlayersData || []) as AllPlayer[];

  return (
    <CheckinsClient
      initialDate={today}
      initialCheckins={playerCheckins}
      allPlayers={allPlayers}
    />
  );
}
