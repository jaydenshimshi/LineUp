'use client';

/**
 * Teams Generation Client Component
 * Uses dropdown selectors for team assignment (mobile-friendly)
 */

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
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
import { ChevronDownIcon, Check } from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';

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
  bench_team: string | null;
  players: {
    id: string;
    full_name: string;
    main_position: string;
    alt_position: string | null;
  };
  rating?: number;
}

// Helper function to render star rating
function StarRating({ rating }: { rating?: number }) {
  if (!rating) return null;
  return (
    <span className="text-[10px] text-amber-500" title={`Rating: ${rating}/5`}>
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

// Helper function to calculate team average rating
function getTeamAverageRating(players: TeamAssignment[]): number | null {
  const ratingsWithValues = players.filter(p => p.rating !== undefined);
  if (ratingsWithValues.length === 0) return null;
  const sum = ratingsWithValues.reduce((acc, p) => acc + (p.rating || 0), 0);
  return sum / ratingsWithValues.length;
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

type TeamColor = 'red' | 'blue' | 'yellow' | 'sub';

const teamColors = {
  red: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-300 dark:border-red-900',
    text: 'text-red-700 dark:text-red-400',
    badge: 'bg-red-500 text-white',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-300 dark:border-blue-900',
    text: 'text-blue-700 dark:text-blue-400',
    badge: 'bg-blue-500 text-white',
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    border: 'border-yellow-300 dark:border-yellow-900',
    text: 'text-yellow-700 dark:text-yellow-400',
    badge: 'bg-yellow-500 text-white',
  },
  sub: {
    bg: 'bg-gray-50 dark:bg-gray-900/30',
    border: 'border-gray-300 dark:border-gray-700',
    text: 'text-gray-700 dark:text-gray-400',
    badge: 'bg-gray-500 text-white',
  },
};

const positionLabels: Record<string, string> = {
  GK: '🧤 GK',
  DF: '🛡️ DF',
  MID: '⚙️ MID',
  ST: '⚡ ST',
};

// Position order for sorting: GK first, then DF, MID, ST
const positionOrder: Record<string, number> = {
  'GK': 1,
  'DF': 2,
  'MID': 3,
  'ST': 4,
};

const sortByPosition = (a: TeamAssignment, b: TeamAssignment) => {
  const posA = positionOrder[a.players.main_position] || 5;
  const posB = positionOrder[b.players.main_position] || 5;
  return posA - posB;
};

// Team selector dropdown component
function TeamSelector({
  value,
  onChange,
  disabled,
  showYellow,
}: {
  value: TeamColor;
  onChange: (value: TeamColor) => void;
  disabled?: boolean;
  showYellow?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const colors = teamColors[value];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value as TeamColor);
  };

  return (
    <div className="relative">
      <div
        className={cn(
          "relative overflow-hidden rounded-lg transition-all duration-200 border-2",
          isFocused ? "border-primary shadow-md" : colors.border,
          colors.bg,
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <select
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          className={cn(
            "w-full h-9 appearance-none bg-transparent cursor-pointer",
            "outline-none border-none pl-3 pr-8",
            "text-[14px] font-medium capitalize",
            colors.text,
            "disabled:cursor-not-allowed"
          )}
        >
          <option value="red">Red</option>
          <option value="blue">Blue</option>
          {showYellow && <option value="yellow">Yellow</option>}
          <option value="sub">Sub</option>
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronDownIcon className={cn("w-4 h-4", colors.text)} />
        </div>
      </div>
    </div>
  );
}

// Player card with team dropdown
function PlayerTeamCard({
  assignment,
  onTeamChange,
  isLocked,
  showYellow,
}: {
  assignment: TeamAssignment;
  onTeamChange: (playerId: string, newTeam: TeamColor) => void;
  isLocked: boolean;
  showYellow: boolean;
}) {
  const colors = teamColors[assignment.team_color as TeamColor];
  const isSub = assignment.team_color === 'sub';
  const benchTeamColors = isSub && assignment.bench_team ? teamColors[assignment.bench_team as TeamColor] : null;

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border-2 transition-all",
        colors.bg,
        colors.border
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-full bg-background/80 flex items-center justify-center text-xs font-medium flex-shrink-0">
          {assignment.players.full_name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{assignment.players.full_name}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {positionLabels[assignment.players.main_position]}
            </span>
            {isSub && assignment.bench_team && (
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded capitalize", benchTeamColors?.badge)}>
                {assignment.bench_team} sub
              </span>
            )}
            <StarRating rating={assignment.rating} />
          </div>
        </div>
      </div>
      <div className="flex-shrink-0 w-24">
        <TeamSelector
          value={assignment.team_color as TeamColor}
          onChange={(newTeam) => onTeamChange(assignment.player_id, newTeam)}
          disabled={isLocked}
          showYellow={showYellow}
        />
      </div>
    </div>
  );
}

export function TeamsClient({
  orgId,
  date,
  checkedInPlayers,
  existingTeamRun,
}: TeamsClientProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Local state for team assignments
  const [localTeams, setLocalTeams] = useState<Record<TeamColor, TeamAssignment[]>>(() => {
    const teams: Record<TeamColor, TeamAssignment[]> = {
      red: [],
      blue: [],
      yellow: [],
      sub: [],
    };
    if (existingTeamRun?.team_assignments) {
      existingTeamRun.team_assignments.forEach((assignment) => {
        const color = assignment.team_color as TeamColor;
        if (teams[color]) {
          teams[color].push(assignment);
        }
      });
      // Sort each team by position
      Object.keys(teams).forEach((color) => {
        teams[color as TeamColor].sort(sortByPosition);
      });
    }
    return teams;
  });

  // Update localTeams when existingTeamRun changes
  useEffect(() => {
    const teams: Record<TeamColor, TeamAssignment[]> = {
      red: [],
      blue: [],
      yellow: [],
      sub: [],
    };
    if (existingTeamRun?.team_assignments) {
      existingTeamRun.team_assignments.forEach((assignment) => {
        const color = assignment.team_color as TeamColor;
        if (teams[color]) {
          teams[color].push(assignment);
        }
      });
      Object.keys(teams).forEach((color) => {
        teams[color as TeamColor].sort(sortByPosition);
      });
    }
    setLocalTeams(teams);
    setHasChanges(false);
  }, [existingTeamRun]);

  const canGenerate = checkedInPlayers.length >= 6;
  const hasExistingTeams = existingTeamRun && existingTeamRun.team_assignments.length > 0;
  const isPublished = existingTeamRun?.status === 'published';
  const isLocked = existingTeamRun?.status === 'locked';
  const showYellow = localTeams.yellow.length > 0 || checkedInPlayers.length >= 21;

  // All players flat list for display
  const allAssignments = [
    ...localTeams.red,
    ...localTeams.blue,
    ...localTeams.yellow,
    ...localTeams.sub,
  ].sort((a, b) => a.players.full_name.localeCompare(b.players.full_name));

  const handleTeamChange = useCallback((playerId: string, newTeam: TeamColor) => {
    setLocalTeams((prev) => {
      const newTeams = { ...prev };

      // Find and remove player from current team
      let playerAssignment: TeamAssignment | undefined;
      for (const [color, assignments] of Object.entries(newTeams)) {
        const idx = assignments.findIndex((a) => a.player_id === playerId);
        if (idx !== -1) {
          playerAssignment = assignments[idx];
          newTeams[color as TeamColor] = assignments.filter((a) => a.player_id !== playerId);
          break;
        }
      }

      if (!playerAssignment) return prev;

      // Add to new team
      newTeams[newTeam] = [
        ...newTeams[newTeam],
        {
          ...playerAssignment,
          team_color: newTeam,
          bench_team: newTeam === 'sub' ? playerAssignment.team_color : null,
        },
      ].sort(sortByPosition);

      return newTeams;
    });
    setHasChanges(true);
  }, []);

  const handleSaveChanges = async () => {
    if (!existingTeamRun) return;

    setIsSaving(true);
    try {
      const assignments = Object.entries(localTeams).flatMap(
        ([color, players]) =>
          players.map((p) => ({
            playerId: p.player_id,
            teamColor: color as TeamColor,
            benchTeam: p.bench_team,
          }))
      );

      const response = await fetch(
        `/api/teams/${existingTeamRun.id}/assignments`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignments }),
        }
      );

      if (response.ok) {
        toast.success('Team assignments saved!');
        setHasChanges(false);
        router.refresh();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to save changes');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSaving(false);
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
        toast.success('Teams generated!');
        setHasChanges(false);
        router.refresh();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to generate teams');
      }
    } catch {
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
      });

      if (response.ok) {
        toast.success('Teams published!');
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
      });

      if (response.ok) {
        toast.success('Teams locked!');
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

  const handleDelete = async () => {
    if (!existingTeamRun) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/teams/${existingTeamRun.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Teams deleted!');
        setShowDeleteDialog(false);
        router.refresh();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete teams');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsDeleting(false);
    }
  };

  // Parse date correctly
  const [year, month, day] = date.split('-').map(Number);
  const displayDate = format(new Date(year, month - 1, day), 'EEEE, MMMM d');

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto py-4 px-3 max-w-lg">
        {/* Header */}
        <div className="mb-4">
          <BackButton className="-ml-2 mb-1" />
          <h1 className="text-xl font-bold">Generate Teams</h1>
          <p className="text-sm text-muted-foreground">{displayDate}</p>
        </div>

        {/* Status Card */}
        <Card className="mb-4">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl font-bold">{checkedInPlayers.length}</span>
                  <span className="text-sm text-muted-foreground">players</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {canGenerate ? (
                    <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Ready
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      Need {6 - checkedInPlayers.length} more
                    </Badge>
                  )}
                  {isLocked && <Badge className="text-[10px] bg-red-500">Locked</Badge>}
                  {isPublished && !isLocked && <Badge className="text-[10px]">Published</Badge>}
                  {hasChanges && <Badge className="text-[10px] bg-orange-500">Unsaved</Badge>}
                </div>
              </div>
              <div className="flex gap-2">
                {hasChanges && !isLocked && (
                  <Button onClick={handleSaveChanges} disabled={isSaving} size="sm">
                    {isSaving ? '...' : 'Save'}
                  </Button>
                )}
                {!isLocked && (
                  <Button
                    onClick={handleGenerate}
                    disabled={!canGenerate || isGenerating}
                    size="sm"
                    variant={hasChanges ? 'outline' : 'default'}
                  >
                    {isGenerating ? '...' : hasExistingTeams ? 'Regen' : 'Generate'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {hasExistingTeams && (
          <div className="flex gap-2 mb-4">
            {!isPublished && !isLocked && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPublishDialog(true)}
                disabled={hasChanges}
                className="flex-1"
              >
                Publish
              </Button>
            )}
            {isPublished && !isLocked && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowLockDialog(true)}
                className="flex-1"
              >
                Lock
              </Button>
            )}
            {!isLocked && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive"
              >
                Delete
              </Button>
            )}
          </div>
        )}

        {/* Team Summary */}
        {hasExistingTeams && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            {(['red', 'blue', 'yellow', 'sub'] as const)
              .filter((color) => color !== 'yellow' || localTeams.yellow.length > 0)
              .map((color) => {
                const count = localTeams[color].length;
                const avgRating = getTeamAverageRating(localTeams[color]);
                const colors = teamColors[color];
                return (
                  <Card key={color} className={cn("overflow-hidden", colors.bg, colors.border)}>
                    <CardContent className="p-2 text-center">
                      <p className={cn("text-xs font-medium capitalize", colors.text)}>
                        {color === 'sub' ? 'Subs' : color}
                      </p>
                      <p className="text-lg font-bold">{count}</p>
                      {avgRating !== null && (
                        <p className="text-[10px] text-amber-600">{avgRating.toFixed(1)}★</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}

        {/* Players List with Dropdowns */}
        {hasExistingTeams && (
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm">Player Assignments</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              {allAssignments.map((assignment) => (
                <PlayerTeamCard
                  key={assignment.id}
                  assignment={assignment}
                  onTeamChange={handleTeamChange}
                  isLocked={!!isLocked}
                  showYellow={showYellow}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Checked-in Players (before generation) */}
        {!hasExistingTeams && (
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm">Checked-in Players</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              {checkedInPlayers.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {checkedInPlayers.map((player) => (
                    <Badge key={player.id} variant="secondary" className="text-xs py-1">
                      {player.full_name}
                      <span className="ml-1 opacity-60">{positionLabels[player.main_position]}</span>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No players checked in yet
                </p>
              )}
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
              Players will be able to see their team assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? 'Publishing...' : 'Publish'}
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
              This cannot be undone. No more changes will be allowed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLock}
              disabled={isLocking}
              className="bg-destructive text-destructive-foreground"
            >
              {isLocking ? 'Locking...' : 'Lock'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete teams?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all team assignments. You can regenerate afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
