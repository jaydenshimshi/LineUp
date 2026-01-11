/**
 * Organization Layout
 * Wraps all pages within an organization context
 */

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OrgNav } from '@/components/org/org-nav';

interface OrgLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get organization by slug
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug, sport, logo_url')
    .eq('slug', slug)
    .single();

  if (orgError || !org) {
    notFound();
  }

  const orgData = org as {
    id: string;
    name: string;
    slug: string;
    sport: string;
    logo_url: string | null;
  };

  // Check membership
  const { data: membership, error: memberError } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('organization_id', orgData.id)
    .single();

  if (memberError || !membership) {
    // Not a member, redirect to org join page or show error
    redirect('/organizations');
  }

  const role = (membership as { role: string }).role as 'member' | 'admin' | 'owner';
  const isAdmin = ['admin', 'owner'].includes(role);

  return (
    <div className="min-h-screen flex flex-col">
      <OrgNav org={orgData} role={role} isAdmin={isAdmin} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
