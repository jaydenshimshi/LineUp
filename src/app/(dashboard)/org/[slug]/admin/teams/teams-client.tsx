'use client';

/**
 * Teams Generation Client Component
 * Beautiful UI for generating and managing teams
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Player {
  id: string;
  full_name: string;
  age: number;
  main_position: string;
  alt_position: string | null;
  rating: number;
}

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

interface TeamsClientProps {
  orgId: string;
  orgSlug: string;
  date: string;
  checkedInPlayers: Player[];
  existingTeamRun: TeamRun | null;
  adminId: string;
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
  GK: '🧤 GK',
  DF: '🛡️ DF',
  MID: '⚙️ MID',
  ST: '⚡ ST',
};

export function TeamsClient({
  orgId,
  orgSlug,
  date,
  checkedInPlayers,
  existingTeamRun,
  adminId,
}: TeamsClientProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [generatedTeams, setGeneratedTeams] = useState<Record<string, Player[]> | null>(null);

  const canGenerate = checkedInPlayers.length >= 6;
  const hasExistingTeams = existingTeamRun && existingTeamRun.team_assignments.length > 0;
  const isPublished = existingTeamRun?.status === 'published';
  const isLocked = existingTeamRun?.status === 'locked';

  // Group existing teams
  const existingTeams: Record<string, TeamAssignment[]> = {
    red: [],
    blue: [],
    yellow: [],
    sub: [],
  };

  if (existingTeamRun?.team_assignments) {
    existingTeamRun.team_assignments.forEach((assignment) => {
      if (existingTeams[assignment.team_color]) {
        existingTeams[assignment.team_color].push(assignment);
      }
    });
  }

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/teams/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: orgId,
          date: date,
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

      if (response.ok) {
        const data = await response.json();
        // Transform response to our format
        const teams: Record<string, Player[]> = {
          red: [],
          blue: [],
          yellow: [],
          sub: [],
        };

        if (data.teams) {
          data.teams.forEach((team: { color: string; players: { id: string }[] }) => {
            const color = team.color.toLowerCase();
            if (teams[color]) {
              teams[color] = team.players.map((p: { id: string }) => {
                const player = checkedInPlayers.find((cp) => cp.id === p.id);
                return player!;
              }).filter(Boolean);
            }
          });
        }

        setGeneratedTeams(teams);
        toast.success('Teams generated!');
        router.refresh();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to generate teams');
      }
    } catch (error) {
      console.error('Generate error:', error);
      toast.error('Something went wrong');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!existingTeamRun) return;

    setIsPublishing(true);
    try {
      const response = await fetch(`/api/teams/${existingTeamRun.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        toast.success('Teams published! Players can now see their assignments.');
        setShowPublishDialog(false);
        router.refresh();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to publish teams');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleLock = async () => {
    if (!existingTeamRun) return;

    setIsLocking(true);
    try {
      const response = await fetch(`/api/teams/${existingTeamRun.id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        toast.success('Teams locked! No more changes can be made.');
        setShowLockDialog(false);
        router.refresh();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to lock teams');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLocking(false);
    }
  };

  const displayDate = format(new Date(date), 'EEEE, MMMM d');

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Generate Teams</h1>
          <p className="text-muted-foreground mt-1">{displayDate}</p>
        </div>

        {/* Status Card */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl font-bold">{checkedInPlayers.length}</span>
                  <span className="text-muted-foreground">players checked in</span>
                </div>
                <div className="flex items-center gap-2">
                  {canGenerate ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Ready to generate
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      Need {6 - checkedInPlayers.length} more players
                    </Badge>
                  )}
                  {isLocked && (
                    <Badge className="bg-red-500 text-white">
                      Locked
                    </Badge>
                  )}
                  {isPublished && !isLocked && (
                    <Badge className="bg-primary text-primary-foreground">
                      Published
                    </Badge>
                  )}
                  {hasExistingTeams && !isPublished && !isLocked && (
                    <Badge variant="outline">Draft</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {!isLocked && (
                  <Button
                    onClick={handleGenerate}
                    disabled={!canGenerate || isGenerating}
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Generating...
                      </>
                    ) : hasExistingTeams ? (
                      'Regenerate'
                    ) : (
                      'Generate Teams'
                    )}
                  </Button>
                )}
                {hasExistingTeams && !isPublished && !isLocked && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowPublishDialog(true)}
                  >
                    Publish
                  </Button>
                )}
                {isPublished && !isLocked && (
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={() => setShowLockDialog(true)}
                  >
                    Lock Teams
                  </Button>
                )}
                {isLocked && (
                  <Badge variant="secondary" className="px-4 py-2 text-base">
                    Teams are locked
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checked-in Players List */}
        {!hasExistingTeams && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Checked-in Players</CardTitle>
              <CardDescription>
                These players will be assigned to teams
              </CardDescription>
            </CardHeader>
            <CardContent>
              {checkedInPlayers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {checkedInPlayers.map((player) => (
                    <Badge
                      key={player.id}
                      variant="secondary"
                      className="py-1.5 px-3 flex items-center gap-2"
                    >
                      <span>{player.full_name}</span>
                      <span className="text-xs opacity-60">
                        {positionLabels[player.main_position]}
                      </span>
                      <span className="text-xs bg-background/50 px-1 rounded">
                        {'⭐'.repeat(player.rating)}
                      </span>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No players have checked in yet
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Teams Display */}
        {hasExistingTeams && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Teams</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {(['red', 'blue', 'yellow'] as const).map((color) => {
                const teamPlayers = existingTeams[color];
                if (teamPlayers.length === 0) return null;

                const colors = teamColors[color];

                return (
                  <Card
                    key={color}
                    className={cn(colors.bg, colors.border, 'border-2 overflow-hidden')}
                  >
                    <div className={cn(colors.header, 'px-4 py-3 flex items-center justify-between')}>
                      <h3 className={cn(colors.text, 'font-bold text-lg capitalize')}>
                        Team {color}
                      </h3>
                      <Badge className={colors.badge}>
                        {teamPlayers.length} players
                      </Badge>
                    </div>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        {teamPlayers.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center text-xs font-medium">
                                {assignment.players.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                              </div>
                              <span className="font-medium text-sm">
                                {assignment.players.full_name}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {positionLabels[assignment.players.main_position]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Subs */}
            {existingTeams.sub.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Substitutes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {existingTeams.sub.map((assignment) => (
                      <Badge key={assignment.id} variant="secondary" className="py-1.5 px-3">
                        {assignment.players.full_name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Balance Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>📊</span> Balance Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  {(['red', 'blue', 'yellow'] as const).map((color) => {
                    const teamPlayers = existingTeams[color];
                    if (teamPlayers.length === 0) return null;

                    // Calculate stats (we'd need actual player data with ratings)
                    return (
                      <div key={color}>
                        <p className={cn('font-semibold capitalize', teamColors[color].text)}>
                          {color}
                        </p>
                        <p className="text-2xl font-bold">{teamPlayers.length}</p>
                        <p className="text-xs text-muted-foreground">players</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* No players message */}
        {!canGenerate && checkedInPlayers.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-xl font-semibold mb-2">No check-ins yet</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Players need to check in for today before you can generate teams.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Publish Dialog */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish teams?</AlertDialogTitle>
            <AlertDialogDescription>
              Once published, all players will be able to see their team assignments.
              You can still regenerate teams after publishing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? 'Publishing...' : 'Publish Teams'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lock Dialog */}
      <AlertDialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lock teams?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently lock the teams for today. Once locked, you will not be able to regenerate or make changes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLock}
              disabled={isLocking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLocking ? 'Locking...' : 'Lock Teams'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
