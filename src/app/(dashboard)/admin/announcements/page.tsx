/**
 * Admin announcements management page
 */

import { createClient } from '@/lib/supabase/server';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AnnouncementsClient } from './announcements-client';
import type { Metadata } from 'next';
import type { Announcement } from '@/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Manage Announcements',
  description: 'Create and manage announcements for players',
};

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient();

  // Get all announcements
  const { data: announcementsData, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });
  const announcements = announcementsData as Announcement[] | null;

  if (error) {
    console.error('Error fetching announcements:', error);
  }

  // Calculate stats
  const activeCount =
    announcements?.filter((a) => a.is_active).length || 0;
  const globalCount =
    announcements?.filter((a) => a.scope_type === 'global').length || 0;
  const dateSpecificCount =
    announcements?.filter((a) => a.scope_type === 'date_specific').length || 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Announcements
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Create and manage announcements for your players
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {activeCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Global</CardDescription>
            <CardTitle className="text-2xl">{globalCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Date-Specific</CardDescription>
            <CardTitle className="text-2xl">{dateSpecificCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <AnnouncementsClient announcements={announcements || []} />
    </div>
  );
}
