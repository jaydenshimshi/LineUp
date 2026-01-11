/**
 * Admin Announcements Page
 * Create, edit, and manage announcements for the organization
 */

import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { AnnouncementsClient } from './announcements-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function AdminAnnouncementsPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  // Get organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug, sport')
    .eq('slug', slug)
    .single();

  if (orgError || !org) {
    notFound();
  }

  const orgData = org as { id: string; name: string; slug: string; sport: string };

  // Check if user is admin
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

  // Get announcements
  const { data: announcementsData } = await supabase
    .from('announcements')
    .select('*')
    .eq('organization_id', orgData.id)
    .order('created_at', { ascending: false });

  // Transform body to message for client compatibility
  interface DbAnnouncement {
    id: string;
    title: string;
    body: string;
    scope_type: 'global' | 'date_specific';
    scope_date: string | null;
    urgency: 'info' | 'important';
    visible_from: string;
    visible_until: string | null;
    created_at: string;
  }

  const announcements = (announcementsData || []).map((a) => {
    const dbRow = a as DbAnnouncement;
    return {
      id: dbRow.id,
      title: dbRow.title,
      message: dbRow.body,
      scope_type: dbRow.scope_type === 'date_specific' ? 'date' as const : 'global' as const,
      scope_date: dbRow.scope_date,
      urgency: dbRow.urgency,
      visible_from: dbRow.visible_from,
      visible_until: dbRow.visible_until,
      created_at: dbRow.created_at,
    };
  });

  return (
    <AnnouncementsClient
      organizationId={orgData.id}
      orgSlug={orgData.slug}
      announcements={announcements}
    />
  );
}
