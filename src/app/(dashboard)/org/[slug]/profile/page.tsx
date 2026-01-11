/**
 * Organization Profile Page
 * Create/edit player profile for this organization
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileClient } from './profile-client';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Profile - Lineup',
  description: 'Complete your player profile',
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProfilePage({ params }: PageProps) {
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
    .select('id, name, sport')
    .eq('slug', slug)
    .single();

  if (!org) {
    redirect('/organizations');
  }

  const orgData = org as { id: string; name: string; sport: string };

  // Check membership
  const { data: membership } = await supabase
    .from('memberships')
    .select('id')
    .eq('user_id', user.id)
    .eq('organization_id', orgData.id)
    .single();

  if (!membership) {
    redirect('/organizations');
  }

  // Get existing player profile for this org
  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('user_id', user.id)
    .eq('organization_id', orgData.id)
    .single();

  return (
    <ProfileClient
      orgId={orgData.id}
      orgSlug={slug}
      orgName={orgData.name}
      userId={user.id}
      existingProfile={player as {
        id: string;
        full_name: string;
        age: number;
        main_position: string;
        alt_position: string | null;
        contact_email: string | null;
        contact_phone: string | null;
        contact_opt_in: boolean;
        profile_completed: boolean;
      } | null}
    />
  );
}
