/**
 * Admin Settings Page
 * Organization settings and configuration
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SettingsClient } from './settings-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings - Admin',
  description: 'Organization settings',
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SettingsPage({ params }: PageProps) {
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
    .select('*')
    .eq('slug', slug)
    .single();

  if (!org) {
    redirect('/organizations');
  }

  const orgData = org as {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    sport: string;
    logo_url: string | null;
    join_code: string | null;
    is_public: boolean;
    settings: Record<string, unknown>;
    created_at: string;
  };

  // Check owner access (only owners can access settings)
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

  const isOwner = role === 'owner';

  return (
    <SettingsClient
      org={orgData}
      isOwner={isOwner}
    />
  );
}
