/**
 * Join Organization by Code Page
 *
 * Handles QR code scans - works for both logged in and logged out users.
 * Stores the join code and redirects appropriately.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { JoinClient } from './join-client';

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function JoinPage({ params }: PageProps) {
  const { code } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If logged in, redirect to organizations page with join code
  if (user) {
    redirect(`/organizations?join=${code}`);
  }

  // If not logged in, show the join client which will handle signup flow
  return <JoinClient joinCode={code} />;
}
