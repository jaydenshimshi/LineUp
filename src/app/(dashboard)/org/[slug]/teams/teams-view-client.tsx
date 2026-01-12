'use client';

import { useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShareTeams } from '@/components/teams/share-teams';

interface TeamAssignment {
  id: string;
  team_color: 'red' | 'blue' | 'yellow' | 'sub';
  assigned_role: string | null;
  bench_team: string | null;
  players: {
    id: string;
    full_name: string;
    main_position: string;
    alt_position: string | null;
  };
}

interface TeamsViewClientProps {
  orgName: string;
  teams: Record<string, TeamAssignment[]>;
  hasTeams: boolean;
  dateString: string;
  sessionLabel: string;
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
  GK: 'GK',
  DF: 'DF',
  MID: 'MID',
  ST: 'ST',
};

export function TeamsViewClient({ orgName, teams, hasTeams, dateString, sessionLabel }: TeamsViewClientProps) {
  const teamsRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-3 px-3 max-w-lg">
        {/* Header - Compact */}
        <div className="mb-3 text-center">
          <h1 className="text-base font-semibold">Game Day Teams</h1>
          <p className="text-[11px] text-muted-foreground">
            {sessionLabel}
          </p>
        </div>

        {hasTeams ? (
          <>
            {/* Status Badge + Share */}
            <div className="flex items-center justify-center gap-3 mb-3">
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 text-[10px]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                Published
              </Badge>
              <ShareTeams
                contentRef={teamsRef}
                teamsDate={dateString}
                orgName={orgName}
              />
            </div>

            {/* Teams Container for export */}
            <div ref={teamsRef} className="space-y-2 p-0.5">
              {/* Teams Grid */}
              <div className="grid gap-2 grid-cols-2">
                {(['red', 'blue', 'yellow'] as const).map((color) => {
                  const teamPlayers = teams[color];
                  if (teamPlayers.length === 0) return null;

                  const colors = teamColors[color];

                  return (
                    <Card
                      key={color}
                      className={`${colors.bg} ${colors.border} border`}
                    >
                      <CardHeader className="p-2 pb-1">
                        <div className="flex items-center justify-between">
                          <CardTitle className={`text-xs ${colors.text} capitalize`}>
                            Team {color}
                          </CardTitle>
                          <Badge className={`${colors.badge} text-[9px] h-4 px-1`}>
                            {teamPlayers.length}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-2 pt-0">
                        <div className="space-y-1">
                          {teamPlayers.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="flex items-center justify-between py-1 border-b border-border/30 last:border-0"
                            >
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-background flex items-center justify-center text-[9px] font-medium">
                                  {assignment.players.full_name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .slice(0, 2)}
                                </div>
                                <span className="text-[11px] font-medium truncate max-w-[80px]">
                                  {assignment.players.full_name}
                                </span>
                              </div>
                              <div className="flex flex-col items-end">
                                <Badge variant="outline" className="text-[8px] h-4 px-1">
                                  {positionLabels[assignment.players.main_position] ||
                                    assignment.players.main_position}
                                </Badge>
                                {assignment.players.alt_position && (
                                  <span className="text-[7px] text-muted-foreground/70">
                                    /{positionLabels[assignment.players.alt_position]}
                                  </span>
                                )}
                              </div>
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
                <Card>
                  <CardHeader className="p-2 pb-1">
                    <CardTitle className="text-xs">Substitutes</CardTitle>
                    <CardDescription className="text-[10px]">
                      Ready to rotate in
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-2 pt-0">
                    <div className="space-y-1">
                      {teams.sub.map((assignment) => {
                        const benchColor = assignment.bench_team as 'red' | 'blue' | 'yellow' | null;
                        const benchColors = benchColor ? teamColors[benchColor] : null;
                        return (
                          <div
                            key={assignment.id}
                            className="flex items-center justify-between py-1 border-b border-border/30 last:border-0"
                          >
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium">
                                {assignment.players.full_name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .slice(0, 2)}
                              </div>
                              <span className="text-[11px] font-medium">
                                {assignment.players.full_name}
                              </span>
                              {benchColor && (
                                <span className={`text-[8px] px-1 py-0.5 rounded capitalize ${benchColors?.badge}`}>
                                  {benchColor}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col items-end">
                              <Badge variant="outline" className="text-[8px] h-4 px-1">
                                {positionLabels[assignment.players.main_position] || assignment.players.main_position}
                              </Badge>
                              {assignment.players.alt_position && (
                                <span className="text-[7px] text-muted-foreground/70">
                                  /{positionLabels[assignment.players.alt_position]}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Balance Info */}
            <div className="mt-3 p-2 bg-muted/30 rounded-lg text-center">
              <p className="text-[10px] text-muted-foreground">
                Teams balanced by skill, age, and positions
              </p>
            </div>
          </>
        ) : (
          /* No Teams Yet */
          <Card className="text-center py-8">
            <CardContent>
              <div className="text-4xl mb-2">⏳</div>
              <h3 className="text-sm font-semibold mb-1">No teams yet</h3>
              <p className="text-[11px] text-muted-foreground max-w-[200px] mx-auto">
                Teams haven&apos;t been generated. Check back later!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
