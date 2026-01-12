/**
 * Admin dashboard overview page
 */

import { createClient } from '@/lib/supabase/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Admin overview and statistics',
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Get counts
  const { count: playerCount } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true });

  const { count: ratedCount } = await supabase
    .from('player_admin_ratings')
    .select('*', { count: 'exact', head: true });

  const { count: announcementCount } = await (supabase
    .from('announcements')
    .select('*', { count: 'exact', head: true }) as any)
    .eq('is_active', true);

  // Get today's date for checkins (Phase 2)
  const today = new Date().toISOString().split('T')[0];
  const { count: checkinCount } = await (supabase
    .from('checkins')
    .select('*', { count: 'exact', head: true }) as any)
    .eq('date', today)
    .eq('status', 'checked_in');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Admin Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Overview of your soccer community
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Players</CardDescription>
            <CardTitle className="text-4xl">{playerCount || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Registered players</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Players Rated</CardDescription>
            <CardTitle className="text-4xl">{ratedCount || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">
              {playerCount && ratedCount
                ? `${Math.round((ratedCount / playerCount) * 100)}% rated`
                : 'No ratings yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Announcements</CardDescription>
            <CardTitle className="text-4xl">{announcementCount || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Currently visible</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Today&apos;s Check-ins</CardDescription>
            <CardTitle className="text-4xl">{checkinCount || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Players available today</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/admin/players"
              className="block p-3 rounded-md bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              <span className="font-medium">Manage Players</span>
              <span className="block text-sm text-gray-500">
                View and manage all registered players
              </span>
            </a>
            <a
              href="/admin/ratings"
              className="block p-3 rounded-md bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              <span className="font-medium">Player Ratings</span>
              <span className="block text-sm text-gray-500">
                Assign skill ratings to players
              </span>
            </a>
            <a
              href="/admin/announcements"
              className="block p-3 rounded-md bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              <span className="font-medium">Announcements</span>
              <span className="block text-sm text-gray-500">
                Create and manage announcements
              </span>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phase Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Phase 1: Foundation</span>
              <span className="text-green-600 font-medium">Complete</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Phase 2: Check-ins</span>
              <span className="text-yellow-600 font-medium">Coming Soon</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Phase 3: Team Optimizer</span>
              <span className="text-gray-400">Planned</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Phase 4: LLM Enhancements</span>
              <span className="text-gray-400">Planned</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
