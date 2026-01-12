'use client';

/**
 * Admin Dashboard Client Component
 * Handles team generation directly and displays generated teams
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TeamAssignment {
  id: string;
  team_color: string;
  assigned_role: string | null;
  player_id: string;
  players: {
    id: string;
    full_name: string;
    main_position: string;
  };
}

interface TeamRun {
  id: string;
  status: string;
  team_assignments: TeamAssignment[];
}

interface CheckedInPlayer {
  id: string;
  full_name: string;
  age: number;
  main_position: string;
  alt_position: string | null;
  rating: number;
}

interface AdminDashboardClientProps {
  orgId: string;
  orgSlug: string;
  orgName: string;
  orgCreatedAt: string;
  role: string;
  memberCount: number;
  playerCount: number;
  manualPlayerCount: number;
  todayCheckins: number;
  ratedPlayers: number;
  teamStatus: string;
  activeAnnouncements: number;
  existingTeamRun: TeamRun | null;
  checkedInPlayers: CheckedInPlayer[];
  sessionDate: string; // yyyy-MM-dd format
  sessionLabel: string; // e.g., "Today (Mon, Jan 13)" or "Tomorrow (Tue, Jan 14)"
}

const teamColors = {
  red: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-300 dark:border-red-900',
    text: 'text-red-700 dark:text-red-400',
    badge: 'bg-red-500 text-white',
    header: 'bg-red-100 dark:bg-red-900/50',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-300 dark:border-blue-900',
    text: 'text-blue-700 dark:text-blue-400',
    badge: 'bg-blue-500 text-white',
    header: 'bg-blue-100 dark:bg-blue-900/50',
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    border: 'border-yellow-300 dark:border-yellow-900',
    text: 'text-yellow-700 dark:text-yellow-400',
    badge: 'bg-yellow-500 text-white',
    header: 'bg-yellow-100 dark:bg-yellow-900/50',
  },
  sub: {
    bg: 'bg-gray-50 dark:bg-gray-900/30',
    border: 'border-gray-300 dark:border-gray-700',
    text: 'text-gray-700 dark:text-gray-400',
    badge: 'bg-gray-500 text-white',
    header: 'bg-gray-100 dark:bg-gray-800',
  },
};

const positionLabels: Record<string, string> = {
  GK: 'GK',
  DF: 'DF',
  MID: 'MID',
  ST: 'ST',
};

export function AdminDashboardClient({
  orgId,
  orgSlug,
  orgName,
  orgCreatedAt,
  role,
  memberCount,
  playerCount,
  manualPlayerCount,
  todayCheckins,
  ratedPlayers,
  teamStatus: initialTeamStatus,
  activeAnnouncements,
  existingTeamRun,
  checkedInPlayers,
  sessionDate,
  sessionLabel,
}: AdminDashboardClientProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [teamStatus, setTeamStatus] = useState(initialTeamStatus);
  const [currentTeamRun, setCurrentTeamRun] = useState<TeamRun | null>(existingTeamRun);

  const totalPlayers = playerCount + manualPlayerCount;
  const canGenerate = todayCheckins >= 6;
  const hasExistingTeams = currentTeamRun && currentTeamRun.team_assignments.length > 0;

  // Group team assignments by color
  const teams: Record<string, TeamAssignment[]> = {
    red: [],
    blue: [],
    yellow: [],
    sub: [],
  };

  if (currentTeamRun?.team_assignments) {
    currentTeamRun.team_assignments.forEach((assignment) => {
      const color = assignment.team_color;
      if (teams[color]) {
        teams[color].push(assignment);
      }
    });
  }

  // Fetch team run data
  const fetchTeamRun = async () => {
    try {
      const response = await fetch(`/api/teams?organization_id=${orgId}&date=${sessionDate}`);
      if (response.ok) {
        const data = await response.json();
        if (data.teamRun) {
          setCurrentTeamRun(data.teamRun);
          setTeamStatus(data.teamRun.status);
        }
      }
    } catch (error) {
      console.error('Failed to fetch team run:', error);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/teams/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: orgId,
          date: sessionDate,
          players: checkedInPlayers.map((p) => ({
            id: p.id,
            name: p.full_name,
            skill: p.rating,
            age: p.age,
            position: p.main_position,
            alt_position: p.alt_position,
          })),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Teams generated! Redirecting to manage teams...');
        // Redirect to manage teams page
        router.push(`/org/${orgSlug}/admin/teams`);
      } else {
        toast.error(data.error || 'Failed to generate teams');
      }
    } catch (error) {
      console.error('Generate error:', error);
      toast.error('Something went wrong');
    } finally {
      setIsGenerating(false);
    }
  };

  const stats = [
    {
      title: 'Members',
      value: memberCount,
      icon: '👥',
      href: `admin/members`,
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    {
      title: 'Players',
      value: totalPlayers,
      description: `(${ratedPlayers} rated)`,
      icon: '⚽',
      href: `admin/players`,
      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    },
    {
      title: 'Check-ins',
      value: todayCheckins,
      icon: '✅',
      href: `admin/teams`,
      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    },
  ];

  const quickActions = [
    {
      title: 'Manage Teams',
      description: 'View and adjust team assignments',
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
              <p className="text-muted-foreground mt-1">{orgName}</p>
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
                  {sessionLabel}
                </p>
                <p className="text-2xl font-bold mt-1">
                  {todayCheckins} players checked in
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {canGenerate ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Ready for teams
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      Need {6 - todayCheckins} more players
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
              <Button
                size="lg"
                disabled={!canGenerate || isGenerating}
                onClick={handleGenerate}
              >
                {isGenerating ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Generating...
                  </>
                ) : hasExistingTeams ? (
                  'Regenerate Teams'
                ) : (
                  'Generate Teams'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Generated Teams Display */}
        {hasExistingTeams && (
          <Card className="mb-8">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Game Day Teams</CardTitle>
                <Link href={`/org/${orgSlug}/admin/teams`}>
                  <Button variant="outline" size="sm">
                    Edit Teams
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4">
                {(['red', 'blue', 'yellow'] as const).map((color) => {
                  const colorConfig = teamColors[color];
                  const teamPlayers = teams[color];

                  return (
                    <div
                      key={color}
                      className={cn(
                        'rounded-lg border-2 overflow-hidden',
                        colorConfig.bg,
                        colorConfig.border
                      )}
                    >
                      <div
                        className={cn(
                          'px-3 py-2 flex items-center justify-between',
                          colorConfig.header
                        )}
                      >
                        <span className={cn('font-bold capitalize', colorConfig.text)}>
                          Team {color}
                        </span>
                        <Badge className={colorConfig.badge} variant="secondary">
                          {teamPlayers.length}
                        </Badge>
                      </div>
                      <div className="p-3 space-y-1.5">
                        {teamPlayers.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="flex items-center justify-between text-sm py-1 px-2 rounded bg-background/50"
                          >
                            <span className="font-medium truncate">
                              {assignment.players.full_name}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {positionLabels[assignment.players.main_position]}
                            </span>
                          </div>
                        ))}
                        {teamPlayers.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            No players
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Substitutes */}
              {teams.sub.length > 0 && (
                <div className="mt-4">
                  <div
                    className={cn(
                      'rounded-lg border-2 overflow-hidden',
                      teamColors.sub.bg,
                      teamColors.sub.border
                    )}
                  >
                    <div
                      className={cn(
                        'px-3 py-2 flex items-center justify-between',
                        teamColors.sub.header
                      )}
                    >
                      <span className={cn('font-bold', teamColors.sub.text)}>
                        Substitutes
                      </span>
                      <Badge className={teamColors.sub.badge} variant="secondary">
                        {teams.sub.length}
                      </Badge>
                    </div>
                    <div className="p-3 flex flex-wrap gap-2">
                      {teams.sub.map((assignment) => (
                        <Badge key={assignment.id} variant="secondary">
                          {assignment.players.full_name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <Link key={stat.title} href={`/org/${orgSlug}/${stat.href}`}>
              <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div
                    className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center text-xl mb-3`}
                  >
                    {stat.icon}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    {stat.description && (
                      <p className="text-xs text-muted-foreground">{stat.description}</p>
                    )}
                  </div>
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
            <Link key={action.title} href={`/org/${orgSlug}/${action.href}`}>
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

        {/* Group Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Group Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{format(new Date(orgCreatedAt), 'MMMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Announcements</span>
                <span>{activeAnnouncements}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profile Completion</span>
                <span>
                  {memberCount
                    ? `${Math.round((playerCount / memberCount) * 100)}%`
                    : '0%'}
                </span>
              </div>
              {manualPlayerCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Manual Players</span>
                  <span>{manualPlayerCount} added by admin</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
