/**
 * Admin Players Management Page
 * View players and manage skill ratings
 * Uses session date (6 AM cutoff) for check-ins
 */

import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getSessionDate } from '@/lib/session-date';
import { PlayersClient } from './players-client';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Players - Admin',
  description: 'Manage players and ratings',
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PlayersPage({ params }: PageProps) {
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
    .select('id, name, slug')
    .eq('slug', slug)
    .single();

  if (!org) {
    redirect('/organizations');
  }

  const orgData = org as { id: string; name: string; slug: string };

  // Check admin access using admin client
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

  // Get all players for this org with their ratings (including admin-created players without user_id)
  const { data: playersData } = await adminSupabase
    .from('players')
    .select(`
      id,
      full_name,
      age,
      main_position,
      alt_position,
      profile_completed,
      created_at,
      user_id
    `)
    .eq('organization_id', orgData.id)
    .eq('profile_completed', true)
    .order('full_name');

  // Get all ratings for the organization (shared across all admins for team generation consistency)
  const { data: ratingsData } = await adminSupabase
    .from('player_admin_ratings')
    .select('player_id, rating_stars')
    .eq('organization_id', orgData.id);

  // Get session date check-ins (6 AM cutoff)
  const { sessionDateString } = getSessionDate();
  const { data: checkinsData } = await adminSupabase
    .from('checkins')
    .select('player_id')
    .eq('organization_id', orgData.id)
    .eq('date', sessionDateString)
    .eq('status', 'checked_in');

  interface Player {
    id: string;
    full_name: string;
    age: number;
    main_position: string;
    alt_position: string | null;
    profile_completed: boolean;
    created_at: string;
    user_id: string | null;
  }

  interface Rating {
    player_id: string;
    rating_stars: number;
  }

  const players = (playersData || []) as Player[];
  const ratings = (ratingsData || []) as Rating[];
  const todayCheckins = (checkinsData || []).map((c: { player_id: string }) => c.player_id);

  // Create ratings map
  const ratingsMap: Record<string, number> = {};
  ratings.forEach((r) => {
    ratingsMap[r.player_id] = r.rating_stars;
  });

  // Combine players with ratings
  const playersWithRatings = players.map((p) => ({
    ...p,
    rating: ratingsMap[p.id] || null,
  }));

  return (
    <PlayersClient
      orgId={orgData.id}
      players={playersWithRatings}
      todayCheckins={todayCheckins}
      adminId={user.id}
      sessionDate={sessionDateString}
    />
  );
}
