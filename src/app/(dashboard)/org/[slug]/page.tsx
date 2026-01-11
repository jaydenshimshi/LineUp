/**
 * Organization Home - Today View
 * Main dashboard when inside an organization
 */

import { redirect, notFound } from 'next/navigation';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OrgTodayClient } from './org-today-client';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Today - Lineup',
  description: 'Check in for today\'s game',
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  scope_type: 'global' | 'date';
  scope_date: string | null;
  urgency: 'info' | 'important';
}

export default async function OrgHomePage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const today = new Date();
  const todayString = format(today, 'yyyy-MM-dd');

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
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

  // Get membership and player profile for this org
  const { data: membership } = await supabase
    .from('memberships')
    .select('role, player_id')
    .eq('user_id', user.id)
    .eq('organization_id', orgData.id)
    .single();

  if (!membership) {
    redirect('/organizations');
  }

  // Get player profile for this org
  const { data: player } = await supabase
    .from('players')
    .select('id, full_name, main_position, profile_completed')
    .eq('user_id', user.id)
    .eq('organization_id', orgData.id)
    .single();

  const membershipData = membership as { role: string; player_id: string | null } | null;
  const isAdmin = membershipData?.role === 'admin' || membershipData?.role === 'owner';

  // Get announcements for this org (global + today-specific)
  const now = new Date().toISOString();
  const { data: announcementsData } = await supabase
    .from('announcements')
    .select('id, title, message, scope_type, scope_date, urgency')
    .eq('organization_id', orgData.id)
    .lte('visible_from', now)
    .or(`visible_until.is.null,visible_until.gte.${now}`)
    .or(`scope_type.eq.global,scope_date.eq.${todayString}`)
    .order('urgency', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5);

  const announcements = (announcementsData || []) as Announcement[];

  // Get today's check-in count
  const { count: checkedInCount } = await supabase
    .from('checkins')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgData.id)
    .eq('date', todayString)
    .eq('status', 'checked_in');

  // Get player's check-in status
  let isCheckedIn = false;
  if (player) {
    const { data: checkin } = await supabase
      .from('checkins')
      .select('id')
      .eq('player_id', (player as { id: string }).id)
      .eq('date', todayString)
      .eq('status', 'checked_in')
      .single();

    isCheckedIn = !!checkin;
  }

  const playerData = player as {
    id: string;
    full_name: string;
    main_position: string;
    profile_completed: boolean;
  } | null;

  // Check if profile is complete
  if (!playerData || !playerData.profile_completed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="container mx-auto py-12 px-4 max-w-lg">
          <Card className="text-center border-2 border-dashed">
            <CardHeader>
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-4xl mx-auto mb-4">
                <span>&#128075;</span>
              </div>
              <CardTitle className="text-2xl">Welcome to {orgData.name}!</CardTitle>
              <CardDescription className="text-base">
                Complete your player profile to start checking in for games
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <span className="font-medium">Profile Required:</span> You need to set up your player profile before you can check in for games.
                </p>
              </div>
              <Link href={`/org/${slug}/profile`}>
                <Button size="lg" className="w-full">
                  Complete Your Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="container mx-auto py-8 px-4 max-w-3xl">
          {/* Welcome Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
              <span>&#128075;</span>
              {format(today, 'EEEE, MMMM d')}
            </div>
            <h1 className="text-3xl font-bold">
              Hey, {playerData.full_name.split(' ')[0]}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Ready to play today?
            </p>
          </div>

          {/* Announcements */}
          {announcements.length > 0 && (
            <div className="mb-6 space-y-3">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={`p-4 rounded-xl border-2 ${
                    announcement.urgency === 'important'
                      ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700'
                      : 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                      announcement.urgency === 'important'
                        ? 'bg-amber-200 dark:bg-amber-800'
                        : 'bg-blue-200 dark:bg-blue-800'
                    }`}>
                      {announcement.urgency === 'important' ? '!' : 'i'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{announcement.title}</h3>
                        {announcement.scope_type === 'date' && (
                          <Badge variant="outline" className="text-xs">Today</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {announcement.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Today Card */}
          <OrgTodayClient
            orgId={orgData.id}
            orgSlug={slug}
            playerId={playerData.id}
            isCheckedIn={isCheckedIn}
            checkedInCount={checkedInCount || 0}
            date={today}
          />

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link href={`/org/${slug}/checkin`}>
              <Card className="hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full group">
                <CardContent className="pt-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <span>&#128197;</span>
                  </div>
                  <p className="font-medium">Week View</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Plan ahead
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href={`/org/${slug}/teams`}>
              <Card className="hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full group">
                <CardContent className="pt-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center text-2xl mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <span>&#128101;</span>
                  </div>
                  <p className="font-medium">Teams</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    View lineup
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href={`/org/${slug}/profile`}>
              <Card className="hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full group">
                <CardContent className="pt-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center text-2xl mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <span>&#128100;</span>
                  </div>
                  <p className="font-medium">Profile</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Edit info
                  </p>
                </CardContent>
              </Card>
            </Link>
            {isAdmin && (
              <Link href={`/org/${slug}/admin`}>
                <Card className="hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full group border-dashed">
                  <CardContent className="pt-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center text-2xl mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <span>&#9881;</span>
                    </div>
                    <p className="font-medium">Admin</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Manage group
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>

          {/* Game Status Summary */}
          <div className="mt-8 p-4 rounded-xl bg-muted/30 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Your status for today</p>
                <p className="font-medium mt-1">
                  {isCheckedIn ? (
                    <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                      <span>&#9989;</span> You&apos;re playing!
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not checked in yet</span>
                  )}
                </p>
              </div>
              <Badge variant="outline" className="text-muted-foreground">
                {playerData.main_position}
              </Badge>
            </div>
          </div>
        </div>
    </div>
  );
}
