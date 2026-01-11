/**
 * Dashboard layout - Main authenticated area
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/header';
import { Toaster } from '@/components/ui/sonner';
import type { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // Get user data
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (!user) {
    redirect('/login');
  }

  // Get player profile
  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('user_id', authUser.id)
    .single();

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} player={player} />
      <main>{children}</main>
      <Toaster richColors />
    </div>
  );
}
