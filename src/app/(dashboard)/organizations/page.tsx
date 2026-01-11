/**
 * Organizations Dashboard - User's groups
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OrganizationsClient } from './organizations-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Groups - Lineup',
  description: 'Manage your sports groups',
};

interface MembershipWithOrg {
  id: string;
  role: 'member' | 'admin' | 'owner';
  joined_at: string;
  organizations: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    sport: string;
    logo_url: string | null;
    created_at: string;
  };
}

export default async function OrganizationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user's memberships with organization data
  const { data: membershipsData } = await supabase
    .from('memberships')
    .select(`
      id,
      role,
      joined_at,
      organizations (
        id,
        name,
        slug,
        description,
        sport,
        logo_url,
        created_at
      )
    `)
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false });

  const memberships = (membershipsData || []) as unknown as MembershipWithOrg[];

  return <OrganizationsClient memberships={memberships} />;
}
