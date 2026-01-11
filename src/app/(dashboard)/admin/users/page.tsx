/**
 * Admin Users Management Page
 */

import { createClient } from '@/lib/supabase/server';
import { UsersClient } from './users-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'User Management - Admin',
  description: 'Manage user roles and permissions',
};

interface UserWithPlayer {
  id: string;
  email: string;
  role: 'player' | 'admin';
  created_at: string;
  players: Array<{
    id: string;
    full_name: string;
    profile_completed: boolean;
  }> | null;
}

export default async function AdminUsersPage() {
  const supabase = await createClient();

  // Get all users with their player profiles
  const { data: usersData } = await supabase
    .from('users')
    .select(`
      id,
      email,
      role,
      created_at,
      players(id, full_name, profile_completed)
    `)
    .order('created_at', { ascending: false });

  const users = (usersData || []) as unknown as UserWithPlayer[];

  return <UsersClient initialUsers={users} />;
}
