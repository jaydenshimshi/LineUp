'use client';

/**
 * Teams Generation Client Component
 * Beautiful UI for generating and managing teams with drag-drop support
 */

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
    header: 'bg-red-100 dark:bg-red-900/50',
    dropzone: 'ring-red-400',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-300 dark:border-blue-900',
    text: 'text-blue-700 dark:text-blue-400',
    badge: 'bg-blue-500 text-white',
    header: 'bg-blue-100 dark:bg-blue-900/50',
    dropzone: 'ring-blue-400',
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    border: 'border-yellow-300 dark:border-yellow-900',
    text: 'text-yellow-700 dark:text-yellow-400',
    badge: 'bg-yellow-500 text-white',
    header: 'bg-yellow-100 dark:bg-yellow-900/50',
    dropzone: 'ring-yellow-400',
  },
  sub: {
    bg: 'bg-gray-50 dark:bg-gray-900/30',
    border: 'border-gray-300 dark:border-gray-700',
    text: 'text-gray-700 dark:text-gray-400',
    badge: 'bg-gray-500 text-white',
    header: 'bg-gray-100 dark:bg-gray-800',
    dropzone: 'ring-gray-400',
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

// Draggable player card component
function DraggablePlayerCard({
  assignment,
  teamColor,
  isLocked,
}: {
  assignment: TeamAssignment;
  teamColor: TeamColor;
  isLocked: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: assignment.player_id,
    disabled: isLocked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'flex items-center justify-between py-2 px-3 rounded-lg border border-border/30 bg-background/50',
        !isLocked && 'cursor-grab active:cursor-grabbing hover:bg-background',
        isDragging && 'ring-2 ring-primary'
      )}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
          {assignment.players.full_name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)}
        </div>
        <div className="flex flex-col">
          <span className="font-medium text-sm">
            {assignment.players.full_name}
          </span>
          <StarRating rating={assignment.rating} />
        </div>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-xs text-muted-foreground">
          {positionLabels[assignment.players.main_position]}
        </span>
        {assignment.players.alt_position && (
          <span className="text-[10px] text-muted-foreground/60">
            alt: {positionLabels[assignment.players.alt_position]}
          </span>
        )}
      </div>
    </div>
  );
}

// Team drop zone component
function TeamDropZone({
  color,
  assignments,
  isLocked,
  isOver,
}: {
  color: TeamColor;
  assignments: TeamAssignment[];
  isLocked: boolean;
  isOver: boolean;
}) {
  const colors = teamColors[color];

  return (
    <Card
      className={cn(
        colors.bg,
        colors.border,
        'border-2 overflow-hidden transition-all',
        isOver && `ring-2 ${colors.dropzone}`
      )}
    >
      <div
        className={cn(
          colors.header,
          'px-4 py-3 flex items-center justify-between'
        )}
      >
        <h3 className={cn(colors.text, 'font-bold text-lg capitalize')}>
          {color === 'sub' ? 'Substitutes' : `Team ${color}`}
        </h3>
        <Badge className={colors.badge}>{assignments.length} players</Badge>
      </div>
      <CardContent className="pt-4 min-h-[100px]">
        <SortableContext
          items={assignments.map((a) => a.player_id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {assignments.map((assignment) => (
              <DraggablePlayerCard
                key={assignment.id}
                assignment={assignment}
                teamColor={color}
                isLocked={isLocked}
              />
            ))}
            {assignments.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                Drop players here
              </div>
            )}
          </div>
        </SortableContext>
        {/* Team Average Rating */}
        {assignments.length > 0 && (() => {
          const avgRating = getTeamAverageRating(assignments);
          if (avgRating === null) return null;
          return (
            <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Team Rating</span>
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                {avgRating.toFixed(1)} / 5
              </span>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}

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
  const [isSaving, setIsSaving] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch with DndKit
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Local state for team assignments (for drag-drop)
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

  // Update localTeams when existingTeamRun changes (e.g., after regeneration)
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
      // Sort each team by position
      Object.keys(teams).forEach((color) => {
        teams[color as TeamColor].sort(sortByPosition);
      });
    }
    setLocalTeams(teams);
    setHasChanges(false);
  }, [existingTeamRun]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const canGenerate = checkedInPlayers.length >= 6;
  const hasExistingTeams =
    existingTeamRun && existingTeamRun.team_assignments.length > 0;
  const isPublished = existingTeamRun?.status === 'published';
  const isLocked = existingTeamRun?.status === 'locked';

  // Find which team a player is in
  const findPlayerTeam = useCallback(
    (playerId: string): TeamColor | null => {
      for (const [color, assignments] of Object.entries(localTeams)) {
        if (assignments.some((a) => a.player_id === playerId)) {
          return color as TeamColor;
        }
      }
      return null;
    },
    [localTeams]
  );

  // Find the active player for drag overlay
  const activePlayer = activeId
    ? Object.values(localTeams)
        .flat()
        .find((a) => a.player_id === activeId)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activePlayerId = active.id as string;
    const overId = over.id as string;

    // Find current team of dragged player
    const sourceTeam = findPlayerTeam(activePlayerId);
    if (!sourceTeam) return;

    // Determine target team
    let targetTeam: TeamColor;

    // Check if dropped over a team zone (the team color itself)
    if (['red', 'blue', 'yellow', 'sub'].includes(overId)) {
      targetTeam = overId as TeamColor;
    } else {
      // Dropped over another player - find their team
      const overPlayerTeam = findPlayerTeam(overId);
      if (!overPlayerTeam) return;
      targetTeam = overPlayerTeam;
    }

    // If same team, no change
    if (sourceTeam === targetTeam) return;

    // Move player to new team
    setLocalTeams((prev) => {
      const newTeams = { ...prev };
      const playerToMove = newTeams[sourceTeam].find(
        (a) => a.player_id === activePlayerId
      );
      if (!playerToMove) return prev;

      // Remove from source
      newTeams[sourceTeam] = newTeams[sourceTeam].filter(
        (a) => a.player_id !== activePlayerId
      );

      // Determine bench_team for subs
      let benchTeam: string | null = null;
      if (targetTeam === 'sub') {
        // If moving to sub, assign bench based on source team or default to red
        if (sourceTeam !== 'sub' && sourceTeam !== 'yellow') {
          benchTeam = sourceTeam; // Use their previous team as bench
        } else if (sourceTeam === 'yellow') {
          benchTeam = 'yellow';
        } else {
          benchTeam = 'red'; // Default to red bench
        }
      }

      // Add to target with updated team_color and bench_team
      newTeams[targetTeam] = [
        ...newTeams[targetTeam],
        {
          ...playerToMove,
          team_color: targetTeam,
          bench_team: benchTeam,
        },
      ];

      return newTeams;
    });

    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    if (!existingTeamRun) return;

    setIsSaving(true);
    try {
      // Collect all assignments with their new team colors and bench teams
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

  const handleDelete = async () => {
    if (!existingTeamRun) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/teams/${existingTeamRun.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
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

  // Parse date correctly to avoid timezone issues (YYYY-MM-DD string -> local date)
  const [year, month, day] = date.split('-').map(Number);
  const displayDate = format(new Date(year, month - 1, day), 'EEEE, MMMM d');

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
                  <span className="text-3xl font-bold">
                    {checkedInPlayers.length}
                  </span>
                  <span className="text-muted-foreground">
                    players checked in
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
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
                    <Badge className="bg-red-500 text-white">Locked</Badge>
                  )}
                  {isPublished && !isLocked && (
                    <Badge className="bg-primary text-primary-foreground">
                      Published
                    </Badge>
                  )}
                  {hasExistingTeams && !isPublished && !isLocked && (
                    <Badge variant="outline">Draft</Badge>
                  )}
                  {hasChanges && (
                    <Badge className="bg-orange-500 text-white">
                      Unsaved changes
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {hasChanges && !isLocked && (
                  <Button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    variant="default"
                    size="lg"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
                {!isLocked && (
                  <Button
                    onClick={handleGenerate}
                    disabled={!canGenerate || isGenerating}
                    size="lg"
                    variant={hasChanges ? 'outline' : 'default'}
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
                    disabled={hasChanges}
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
                {hasExistingTeams && !isLocked && (
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    Delete
                  </Button>
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

        {/* Teams Display with Drag and Drop Lists */}
        {hasExistingTeams && !isMounted && (
          <Card className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Loading teams...</span>
            </div>
          </Card>
        )}
        {hasExistingTeams && isMounted && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-6">
              {/* Main Teams Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Team Red */}
                <TeamDropZone
                  color="red"
                  assignments={localTeams.red}
                  isLocked={!!isLocked}
                  isOver={false}
                />

                {/* Team Blue */}
                <TeamDropZone
                  color="blue"
                  assignments={localTeams.blue}
                  isLocked={!!isLocked}
                  isOver={false}
                />
              </div>

              {/* Team Yellow - only if exists */}
              {localTeams.yellow.length > 0 && (
                <div className="max-w-md mx-auto">
                  <TeamDropZone
                    color="yellow"
                    assignments={localTeams.yellow}
                    isLocked={!!isLocked}
                    isOver={false}
                  />
                </div>
              )}

              {/* Substitutes */}
              {localTeams.sub.length > 0 && (
                <TeamDropZone
                  color="sub"
                  assignments={localTeams.sub}
                  isLocked={!!isLocked}
                  isOver={false}
                />
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
                    {/* Only show stats for teams with players */}
                    {(['red', 'blue', 'yellow', 'sub'] as const)
                      .filter((color) => localTeams[color].length > 0)
                      .map((color) => {
                        const teamPlayers = localTeams[color];
                        const avgRating = getTeamAverageRating(teamPlayers);

                        return (
                          <div key={color}>
                            <p
                              className={cn(
                                'font-semibold capitalize',
                                teamColors[color].text
                              )}
                            >
                              {color === 'sub' ? 'Subs' : color}
                            </p>
                            <p className="text-2xl font-bold">
                              {teamPlayers.length}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              players
                            </p>
                            {avgRating !== null && (
                              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                                Avg: {avgRating.toFixed(1)}★
                              </p>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {activePlayer && (
                <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-primary bg-background shadow-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {activePlayer.players.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                    <span className="font-medium text-sm">
                      {activePlayer.players.full_name}
                    </span>
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}

        {/* No players message */}
        {!canGenerate && checkedInPlayers.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-xl font-semibold mb-2">No check-ins yet</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Players need to check in for today before you can generate
                teams.
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
              Once published, all players will be able to see their team
              assignments. You can still regenerate teams after publishing.
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
              This will permanently lock the teams for today. Once locked, you
              will not be able to regenerate or make changes. This action cannot
              be undone.
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

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete teams?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the current team assignments for today. You can
              regenerate new teams afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Teams'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
