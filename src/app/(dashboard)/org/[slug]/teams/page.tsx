/**
 * Teams View Page
 * Display published team assignments
 */

import { redirect } from 'next/navigation';
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
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Teams - Lineup',
  description: 'View team assignments',
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface TeamAssignment {
  id: string;
  team_color: 'red' | 'blue' | 'yellow' | 'sub';
  assigned_role: string | null;
  players: {
    id: string;
    full_name: string;
    main_position: string;
  };
}

interface TeamRun {
  id: string;
  date: string;
  status: string;
  team_assignments: TeamAssignment[];
}

const teamColors = {
  red: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-900',
    text: 'text-red-700 dark:text-red-400',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-900',
    text: 'text-blue-700 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    border: 'border-yellow-200 dark:border-yellow-900',
    text: 'text-yellow-700 dark:text-yellow-400',
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400',
  },
  sub: {
    bg: 'bg-gray-50 dark:bg-gray-900/30',
    border: 'border-gray-200 dark:border-gray-800',
    text: 'text-gray-700 dark:text-gray-400',
    badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  },
};

const positionLabels: Record<string, string> = {
  GK: 'Goalkeeper',
  DF: 'Defender',
  MID: 'Midfielder',
  ST: 'Striker',
};

export default async function TeamsPage({ params }: PageProps) {
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
    .select('id, name')
    .eq('slug', slug)
    .single();

  if (!org) {
    redirect('/organizations');
  }

  const orgData = org as { id: string; name: string };

  // Get today's team run with assignments
  const { data: teamRunData } = await supabase
    .from('team_runs')
    .select(`
      id,
      date,
      status,
      team_assignments (
        id,
        team_color,
        assigned_role,
        players (
          id,
          full_name,
          main_position
        )
      )
    `)
    .eq('organization_id', orgData.id)
    .eq('date', today)
    .in('status', ['published', 'locked'])
    .single();

  const teamRun = teamRunData as TeamRun | null;

  // Group assignments by team
  const teams: Record<string, TeamAssignment[]> = {
    red: [],
    blue: [],
    yellow: [],
    sub: [],
  };

  if (teamRun?.team_assignments) {
    teamRun.team_assignments.forEach((assignment) => {
      if (teams[assignment.team_color]) {
        teams[assignment.team_color].push(assignment);
      }
    });
  }

  const hasTeams = teamRun && Object.values(teams).some((t) => t.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto py-6 px-4 max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Today&apos;s Teams</h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {hasTeams ? (
          <>
            {/* Status Badge */}
            <div className="flex justify-center mb-6">
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-4 py-1"
              >
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                Teams Published
              </Badge>
            </div>

            {/* Teams Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {(['red', 'blue', 'yellow'] as const).map((color) => {
                const teamPlayers = teams[color];
                if (teamPlayers.length === 0) return null;

                const colors = teamColors[color];

                return (
                  <Card
                    key={color}
                    className={`${colors.bg} ${colors.border} border-2`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className={`text-lg ${colors.text} capitalize`}>
                          Team {color}
                        </CardTitle>
                        <Badge className={colors.badge}>
                          {teamPlayers.length} players
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {teamPlayers.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center text-sm font-medium">
                                {assignment.players.full_name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .slice(0, 2)}
                              </div>
                              <span className="font-medium">
                                {assignment.players.full_name}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {positionLabels[assignment.players.main_position] ||
                                assignment.players.main_position}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Subs */}
            {teams.sub.length > 0 && (
              <Card className="mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Substitutes</CardTitle>
                  <CardDescription>
                    Ready to rotate in during the game
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {teams.sub.map((assignment) => (
                      <Badge
                        key={assignment.id}
                        variant="secondary"
                        className="py-1.5 px-3"
                      >
                        {assignment.players.full_name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Balance Info */}
            <div className="mt-6 p-4 bg-muted/50 rounded-xl text-center">
              <p className="text-sm text-muted-foreground">
                Teams are balanced based on skill level, age, and positions for the fairest game possible.
              </p>
            </div>
          </>
        ) : (
          /* No Teams Yet */
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-6xl mb-4">⏳</div>
              <h3 className="text-xl font-semibold mb-2">No teams yet</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Teams haven&apos;t been generated for today. Check back later or ask your admin to generate teams.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
