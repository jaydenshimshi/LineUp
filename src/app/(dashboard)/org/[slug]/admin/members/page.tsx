/**
 * Admin Members Management Page
 * Manage organization members and their roles
 */

import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { MembersClient } from './members-client';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Members - Admin',
  description: 'Manage organization members',
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function MembersPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Use admin client to bypass RLS
  const adminSupabase = createAdminClient();

  // Get organization
  const { data: org } = await adminSupabase
    .from('organizations')
    .select('id, name, slug, join_code')
    .eq('slug', slug)
    .single();

  if (!org) {
    redirect('/organizations');
  }

  const orgData = org as { id: string; name: string; slug: string; join_code: string | null };

  // Check admin access
  const { data: currentMembership } = await adminSupabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('organization_id', orgData.id)
    .single();

  const currentRole = (currentMembership as { role: string } | null)?.role;
  if (!currentRole || !['admin', 'owner'].includes(currentRole)) {
    redirect(`/org/${slug}`);
  }

  // Get all members with their details
  const { data: memberships } = await adminSupabase
    .from('memberships')
    .select(`
      id,
      role,
      joined_at,
      user_id,
      players (
        id,
        full_name,
        profile_completed
      )
    `)
    .eq('organization_id', orgData.id)
    .order('joined_at', { ascending: true });

  // Get users data separately to handle missing records
  const memberUserIds = (memberships || []).map((m: { user_id: string }) => m.user_id);
  const { data: usersData } = await adminSupabase
    .from('users')
    .select('id, email')
    .in('id', memberUserIds.length > 0 ? memberUserIds : ['none']);

  const usersMap = new Map<string, { id: string; email: string }>();
  (usersData || []).forEach((u: { id: string; email: string }) => {
    usersMap.set(u.id, u);
  });

  interface MembershipData {
    id: string;
    role: 'member' | 'admin' | 'owner';
    joined_at: string;
    user_id: string;
    users: {
      id: string;
      email: string;
    } | null;
    players: {
      id: string;
      full_name: string;
      profile_completed: boolean;
    } | null;
  }

  // Combine memberships with users data
  const members = (memberships || []).map((m: { id: string; role: string; joined_at: string; user_id: string; players: { id: string; full_name: string; profile_completed: boolean } | null }) => ({
    ...m,
    users: usersMap.get(m.user_id) || { id: m.user_id, email: 'Unknown email' },
  })) as MembershipData[];

  return (
    <MembersClient
      orgId={orgData.id}
      orgSlug={slug}
      orgName={orgData.name}
      joinCode={orgData.join_code}
      members={members}
      currentUserId={user.id}
      currentRole={currentRole as 'admin' | 'owner'}
    />
  );
}
