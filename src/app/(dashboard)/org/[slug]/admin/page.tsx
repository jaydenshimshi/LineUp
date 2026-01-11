/**
 * Admin Dashboard Overview
 * Central hub for organization admins
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Lineup',
  description: 'Manage your organization',
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function AdminDashboardPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get organization
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug, created_at')
    .eq('slug', slug)
    .single();

  if (!org) {
    redirect('/organizations');
  }

  const orgData = org as { id: string; name: string; slug: string; created_at: string };

  // Check admin access
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

  // Get stats
  const { count: memberCount } = await supabase
    .from('memberships')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgData.id);

  const { count: playerCount } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgData.id)
    .eq('profile_completed', true);

  const { count: todayCheckins } = await supabase
    .from('checkins')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgData.id)
    .eq('date', today)
    .eq('status', 'checked_in');

  const { count: ratedPlayers } = await supabase
    .from('player_admin_ratings')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgData.id);

  // Get today's team status
  const { data: todayTeamRun } = await supabase
    .from('team_runs')
    .select('status')
    .eq('organization_id', orgData.id)
    .eq('date', today)
    .single();

  const teamStatus = (todayTeamRun as { status: string } | null)?.status || 'none';

  // Get active announcements count
  const { count: activeAnnouncements } = await supabase
    .from('announcements')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgData.id)
    .eq('is_active', true);

  const stats = [
    {
      title: 'Total Members',
      value: memberCount || 0,
      icon: '👥',
      href: `admin/members`,
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    {
      title: 'Active Players',
      value: playerCount || 0,
      icon: '⚽',
      href: `admin/players`,
      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    },
    {
      title: 'Today\'s Check-ins',
      value: todayCheckins || 0,
      icon: '✅',
      href: `admin/teams`,
      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    },
    {
      title: 'Players Rated',
      value: ratedPlayers || 0,
      icon: '⭐',
      href: `admin/players`,
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
  ];

  const quickActions = [
    {
      title: 'Generate Teams',
      description: 'Create balanced teams for today',
      icon: '🎯',
      href: `admin/teams`,
      primary: true,
    },
    {
      title: 'Manage Players',
      description: 'View profiles and set ratings',
      icon: '👤',
      href: `admin/players`,
    },
    {
      title: 'Members',
      description: 'Manage roles and access',
      icon: '🔑',
      href: `admin/members`,
    },
    {
      title: 'Settings',
      description: 'Organization settings',
      icon: '⚙️',
      href: `admin/settings`,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto py-6 px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-1">{orgData.name}</p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {role}
            </Badge>
          </div>
        </div>

        {/* Today's Status Banner */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), 'EEEE, MMMM d')}
                </p>
                <p className="text-2xl font-bold mt-1">
                  {todayCheckins || 0} players checked in
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {(todayCheckins || 0) >= 6 ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Ready for teams
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      Need {6 - (todayCheckins || 0)} more players
                    </Badge>
                  )}
                  {teamStatus !== 'none' && (
                    <Badge
                      variant="outline"
                      className={
                        teamStatus === 'published' || teamStatus === 'locked'
                          ? 'border-green-500 text-green-700'
                          : ''
                      }
                    >
                      Teams: {teamStatus}
                    </Badge>
                  )}
                </div>
              </div>
              <Link href={`/org/${slug}/admin/teams`}>
                <Button size="lg" disabled={(todayCheckins || 0) < 6}>
                  Generate Teams
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <Link key={stat.title} href={`/org/${slug}/${stat.href}`}>
              <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center text-xl mb-3`}>
                    {stat.icon}
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action) => (
            <Link key={action.title} href={`/org/${slug}/${action.href}`}>
              <Card
                className={`hover:shadow-md transition-all cursor-pointer h-full ${
                  action.primary ? 'border-primary/50 bg-primary/5' : ''
                }`}
              >
                <CardContent className="pt-6">
                  <div className="text-3xl mb-3">{action.icon}</div>
                  <h3 className="font-semibold">{action.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {action.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Recent Activity Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Group Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{format(new Date(orgData.created_at), 'MMMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Announcements</span>
                <span>{activeAnnouncements || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profile Completion</span>
                <span>
                  {memberCount && playerCount
                    ? `${Math.round((playerCount / memberCount) * 100)}%`
                    : '0%'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
