/**
 * Settings Page
 * User account settings and profile management
 */

import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { SettingsClient } from './settings-client';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Settings - Lineup',
  description: 'Manage your account settings',
};

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user data
  const adminSupabase = createAdminClient();
  const { data: userData } = await adminSupabase
    .from('users')
    .select('id, email, created_at')
    .eq('id', user.id)
    .single();

  // Get all memberships (to show which groups will be affected)
  const { data: memberships } = await adminSupabase
    .from('memberships')
    .select(`
      id,
      role,
      organizations (
        id,
        name,
        slug
      )
    `)
    .eq('user_id', user.id);

  const userInfo = userData as { id: string; email: string; created_at: string } | null;
  const membershipsList = (memberships || []) as Array<{
    id: string;
    role: string;
    organizations: { id: string; name: string; slug: string } | null;
  }>;

  return (
    <SettingsClient
      userId={user.id}
      email={userInfo?.email || user.email || ''}
      createdAt={userInfo?.created_at || ''}
      memberships={membershipsList}
    />
  );
}
