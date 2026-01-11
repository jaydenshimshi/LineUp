/**
 * Root Dashboard - Redirects to organizations
 * In multi-tenant mode, users first see their groups
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user has any memberships
  const { data: memberships, error } = await supabase
    .from('memberships')
    .select('organization_id, organizations(slug)')
    .eq('user_id', user.id)
    .limit(1);

  // If user has exactly one org, go directly there
  // Otherwise, show organizations list
  if (!error && memberships && memberships.length === 1) {
    const membership = memberships[0] as {
      organization_id: string;
      organizations: { slug: string };
    };
    redirect(`/org/${membership.organizations.slug}`);
  }

  // Show organizations list
  redirect('/organizations');
}
