/**
 * Admin Players Management Page
 * View players and manage skill ratings
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PlayersClient } from './players-client';
import type { Metadata } from 'next';

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

  // Get all players for this org with their ratings
  const { data: playersData } = await supabase
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

  // Get ratings separately
  const { data: ratingsData } = await supabase
    .from('player_admin_ratings')
    .select('player_id, rating_stars')
    .eq('organization_id', orgData.id);

  interface Player {
    id: string;
    full_name: string;
    age: number;
    main_position: string;
    alt_position: string | null;
    profile_completed: boolean;
    created_at: string;
    user_id: string;
  }

  interface Rating {
    player_id: string;
    rating_stars: number;
  }

  const players = (playersData || []) as Player[];
  const ratings = (ratingsData || []) as Rating[];

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
      orgSlug={slug}
      players={playersWithRatings}
    />
  );
}
