/**
 * Organization Home - Today View
 * Main dashboard when inside an organization
 */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { createClient, createAdminClient } from '@/lib/supabase/server';
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

  // Use admin client to bypass RLS
  const adminSupabase = createAdminClient();

  // Get organization
  const { data: org, error: orgError } = await adminSupabase
    .from('organizations')
    .select('id, name, slug, sport')
    .eq('slug', slug)
    .single();

  if (orgError || !org) {
    notFound();
  }

  const orgData = org as { id: string; name: string; slug: string; sport: string };

  // Get membership and player profile for this org
  const { data: membership } = await adminSupabase
    .from('memberships')
    .select('role, player_id')
    .eq('user_id', user.id)
    .eq('organization_id', orgData.id)
    .single();

  if (!membership) {
    redirect('/organizations');
  }

  // Get player profile for this org
  const { data: player } = await adminSupabase
    .from('players')
    .select('id, full_name, main_position, profile_completed')
    .eq('user_id', user.id)
    .eq('organization_id', orgData.id)
    .single();

  const membershipData = membership as { role: string; player_id: string | null } | null;
  const isAdmin = membershipData?.role === 'admin' || membershipData?.role === 'owner';

  // Get announcements for this org (global + today-specific)
  const now = new Date().toISOString();
  const { data: announcementsData } = await adminSupabase
    .from('announcements')
    .select('id, title, body, scope_type, scope_date, urgency')
    .eq('organization_id', orgData.id)
    .lte('visible_from', now)
    .or(`visible_until.is.null,visible_until.gte.${now}`)
    .or(`scope_type.eq.global,scope_date.eq.${todayString}`)
    .order('urgency', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5);

  // Transform body to message for client compatibility
  interface DbAnnouncement {
    id: string;
    title: string;
    body: string;
    scope_type: 'global' | 'date_specific';
    scope_date: string | null;
    urgency: 'info' | 'important';
  }

  interface MappedAnnouncement {
    id: string;
    title: string;
    message: string;
    scope_type: 'date' | 'global';
    scope_date: string | null;
    urgency: 'info' | 'important';
  }

  const announcements: MappedAnnouncement[] = (announcementsData || []).map((a: DbAnnouncement) => {
    const dbRow = a;
    return {
      id: dbRow.id,
      title: dbRow.title,
      message: dbRow.body,
      scope_type: dbRow.scope_type === 'date_specific' ? 'date' as const : 'global' as const,
      scope_date: dbRow.scope_date,
      urgency: dbRow.urgency,
    };
  });

  // Get today's check-in count
  const { count: checkedInCount } = await adminSupabase
    .from('checkins')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgData.id)
    .eq('date', todayString)
    .eq('status', 'checked_in');

  // Get player's check-in status
  let isCheckedIn = false;
  if (player) {
    const { data: checkin } = await adminSupabase
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
    <div className="min-h-screen bg-background">
        <div className="container mx-auto py-4 px-3 max-w-lg">
          {/* Welcome Header - Compact */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{format(today, 'EEEE, MMM d')}</p>
                <h1 className="text-lg font-semibold mt-0.5">
                  Hey, {playerData.full_name.split(' ')[0]}!
                </h1>
              </div>
              <Badge variant="outline" className="text-[10px] h-5">
                {playerData.main_position}
              </Badge>
            </div>
          </div>

          {/* Announcements - Compact */}
          {announcements.length > 0 && (
            <div className="mb-4 space-y-2">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={`p-2.5 rounded-lg border ${
                    announcement.urgency === 'important'
                      ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
                      : 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      announcement.urgency === 'important'
                        ? 'bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200'
                        : 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                    }`}>
                      {announcement.urgency === 'important' ? '!' : 'i'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{announcement.title}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
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
            playerName={playerData.full_name}
            isCheckedIn={isCheckedIn}
            checkedInCount={checkedInCount || 0}
            date={today}
          />

          {/* Quick Actions - Compact */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <Link href={`/org/${slug}/checkin`}>
              <Card className="hover:border-primary/50 transition-all cursor-pointer h-full group">
                <CardContent className="p-2 text-center">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-base mx-auto mb-1 group-hover:scale-105 transition-transform">
                    <span>&#128197;</span>
                  </div>
                  <p className="text-[11px] font-medium">Week</p>
                </CardContent>
              </Card>
            </Link>
            <Link href={`/org/${slug}/teams`}>
              <Card className="hover:border-primary/50 transition-all cursor-pointer h-full group">
                <CardContent className="p-2 text-center">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center text-base mx-auto mb-1 group-hover:scale-105 transition-transform">
                    <span>&#128101;</span>
                  </div>
                  <p className="text-[11px] font-medium">Teams</p>
                </CardContent>
              </Card>
            </Link>
            <Link href={`/org/${slug}/profile`}>
              <Card className="hover:border-primary/50 transition-all cursor-pointer h-full group">
                <CardContent className="p-2 text-center">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center text-base mx-auto mb-1 group-hover:scale-105 transition-transform">
                    <span>&#128100;</span>
                  </div>
                  <p className="text-[11px] font-medium">Profile</p>
                </CardContent>
              </Card>
            </Link>
            {isAdmin ? (
              <Link href={`/org/${slug}/admin`}>
                <Card className="hover:border-primary/50 transition-all cursor-pointer h-full group border-dashed">
                  <CardContent className="p-2 text-center">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center text-base mx-auto mb-1 group-hover:scale-105 transition-transform">
                      <span>&#9881;</span>
                    </div>
                    <p className="text-[11px] font-medium">Admin</p>
                  </CardContent>
                </Card>
              </Link>
            ) : (
              <Link href={`/org/${slug}/attendance`}>
                <Card className="hover:border-primary/50 transition-all cursor-pointer h-full group">
                  <CardContent className="p-2 text-center">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center text-base mx-auto mb-1 group-hover:scale-105 transition-transform">
                      <span>&#128200;</span>
                    </div>
                    <p className="text-[11px] font-medium">History</p>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>

          {/* Your Status - Compact */}
          <div className="mt-4 p-2.5 rounded-lg bg-muted/30 border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium ${
                  isCheckedIn
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {playerData.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-medium">{playerData.full_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {isCheckedIn ? (
                      <span className="text-green-600 dark:text-green-400">
                        ✓ Checked in
                      </span>
                    ) : (
                      <span>Not checked in</span>
                    )}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] h-5">
                {playerData.main_position}
              </Badge>
            </div>
          </div>
        </div>
    </div>
  );
}
