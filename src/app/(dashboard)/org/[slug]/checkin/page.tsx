/**
 * Weekly Check-in Page
 * Beautiful calendar view for players to mark availability
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CheckinClient } from './checkin-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Check-in - Lineup',
  description: 'Mark your availability for upcoming games',
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CheckinPage({ params }: PageProps) {
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
    .select('id, name, slug')
    .eq('slug', slug)
    .single();

  if (!org) {
    redirect('/organizations');
  }

  const orgData = org as { id: string; name: string; slug: string };

  // Get player profile for this org
  const { data: player } = await supabase
    .from('players')
    .select('id, full_name, profile_completed')
    .eq('user_id', user.id)
    .eq('organization_id', orgData.id)
    .single();

  const playerData = player as {
    id: string;
    full_name: string;
    profile_completed: boolean;
  } | null;

  // Redirect to profile if not complete
  if (!playerData || !playerData.profile_completed) {
    redirect(`/org/${slug}/profile`);
  }

  // Get player's checkins for the next 14 days
  const today = new Date();
  const twoWeeksLater = new Date(today);
  twoWeeksLater.setDate(today.getDate() + 13);

  const startDate = today.toISOString().split('T')[0];
  const endDate = twoWeeksLater.toISOString().split('T')[0];

  const { data: checkins } = await supabase
    .from('checkins')
    .select('date, status')
    .eq('player_id', playerData.id)
    .eq('organization_id', orgData.id)
    .gte('date', startDate)
    .lte('date', endDate);

  // Get check-in counts for each day
  const { data: allCheckins } = await supabase
    .from('checkins')
    .select('date')
    .eq('organization_id', orgData.id)
    .eq('status', 'checked_in')
    .gte('date', startDate)
    .lte('date', endDate);

  // Count check-ins per day
  const countsByDate: Record<string, number> = {};
  (allCheckins || []).forEach((c: { date: string }) => {
    countsByDate[c.date] = (countsByDate[c.date] || 0) + 1;
  });

  const checkinMap: Record<string, 'checked_in' | 'checked_out'> = {};
  (checkins || []).forEach((c: { date: string; status: string }) => {
    checkinMap[c.date] = c.status as 'checked_in' | 'checked_out';
  });

  return (
    <CheckinClient
      orgId={orgData.id}
      orgSlug={slug}
      playerId={playerData.id}
      playerName={playerData.full_name}
      initialCheckins={checkinMap}
      checkinCounts={countsByDate}
    />
  );
}
