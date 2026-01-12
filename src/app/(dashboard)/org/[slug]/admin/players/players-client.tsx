'use client';

/**
 * Players Client Component
 * Beautiful UI for viewing players and managing ratings
 * Uses session date for check-ins (6 AM cutoff)
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Player {
  id: string;
  full_name: string;
  age: number;
  main_position: string;
  alt_position: string | null;
  profile_completed: boolean;
  created_at: string;
  user_id: string | null;
  rating: number | null;
  checked_in_today?: boolean;
}

interface PlayersClientProps {
  orgId: string;
  players: Player[];
  todayCheckins?: string[]; // Player IDs checked in for session
  adminId?: string; // Current admin's ID (optional)
  sessionDate?: string; // Session date string (yyyy-MM-dd)
}

// Session date calculation (matches session-date.ts)
const SESSION_CUTOFF_HOUR = 6;

function getSessionDateString(): string {
  const now = new Date();
  const currentHour = now.getHours();
  const isAfterCutoff = currentHour >= SESSION_CUTOFF_HOUR;
  const sessionDate = isAfterCutoff ? addDays(now, 1) : now;
  return format(sessionDate, 'yyyy-MM-dd');
}

const positionLabels: Record<string, { label: string; emoji: string; color: string }> = {
  GK: { label: 'Goalkeeper', emoji: '🧤', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  DF: { label: 'Defender', emoji: '🛡️', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  MID: { label: 'Midfielder', emoji: '⚙️', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  ST: { label: 'Striker', emoji: '⚡', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export function PlayersClient({ orgId, players, todayCheckins = [], sessionDate: initialSessionDate }: PlayersClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(3);
  const [isSaving, setIsSaving] = useState(false);
  const [filterPosition, setFilterPosition] = useState<string | null>(null);

  // Session date state - use prop or calculate client-side
  const [sessionDateStr, setSessionDateStr] = useState(initialSessionDate || '');

  // Calculate session date on client mount (to match session-date.ts logic)
  useEffect(() => {
    if (!initialSessionDate) {
      setSessionDateStr(getSessionDateString());
    }
  }, [initialSessionDate]);

  // Add player state
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAge, setNewPlayerAge] = useState('');
  const [newPlayerPosition, setNewPlayerPosition] = useState('');
  const [newPlayerAltPosition, setNewPlayerAltPosition] = useState('');
  const [newPlayerRating, setNewPlayerRating] = useState<number>(3);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);

  // Edit player state
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editAltPosition, setEditAltPosition] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Check-in state - for session date
  const [checkedInPlayers, setCheckedInPlayers] = useState<Set<string>>(new Set(todayCheckins));
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  const filteredPlayers = players.filter((player) => {
    const matchesSearch = player.full_name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesPosition = !filterPosition || player.main_position === filterPosition;
    return matchesSearch && matchesPosition;
  });

  // Group by position
  const groupedPlayers: Record<string, Player[]> = {};
  filteredPlayers.forEach((player) => {
    const pos = player.main_position;
    if (!groupedPlayers[pos]) {
      groupedPlayers[pos] = [];
    }
    groupedPlayers[pos].push(player);
  });

  // Save scroll position when opening dialogs to prevent scroll-to-top
  const handleOpenRating = useCallback((player: Player) => {
    // Prevent scroll reset by briefly locking scroll
    const scrollY = window.scrollY;
    setSelectedPlayer(player);
    setSelectedRating(player.rating || 3);
    // Restore scroll position after state update
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  }, []);

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim() || !newPlayerAge || !newPlayerPosition) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsAddingPlayer(true);
    try {
      const response = await fetch('/api/admin/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: orgId,
          full_name: newPlayerName.trim(),
          age: parseInt(newPlayerAge),
          main_position: newPlayerPosition,
          alt_position: newPlayerAltPosition || null,
          rating_stars: newPlayerRating,
        }),
      });

      if (response.ok) {
        toast.success('Player added successfully!');
        setShowAddPlayer(false);
        setNewPlayerName('');
        setNewPlayerAge('');
        setNewPlayerPosition('');
        setNewPlayerAltPosition('');
        setNewPlayerRating(3);
        router.refresh();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to add player');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsAddingPlayer(false);
    }
  };

  const handleOpenEdit = useCallback((player: Player) => {
    const scrollY = window.scrollY;
    setEditingPlayer(player);
    setEditName(player.full_name);
    setEditAge(player.age.toString());
    setEditPosition(player.main_position);
    setEditAltPosition(player.alt_position || '');
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  }, []);

  const handleEditPlayer = async () => {
    if (!editingPlayer || !editName.trim() || !editAge || !editPosition) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsEditing(true);
    try {
      const response = await fetch('/api/admin/players', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: editingPlayer.id,
          organization_id: orgId,
          full_name: editName.trim(),
          age: parseInt(editAge),
          main_position: editPosition,
          alt_position: editAltPosition || null,
        }),
      });

      if (response.ok) {
        toast.success('Player updated!');
        setEditingPlayer(null);
        router.refresh();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update player');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeletePlayer = async (player: Player) => {
    if (!confirm(`Delete ${player.full_name}? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/players?player_id=${player.id}&organization_id=${orgId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        toast.success('Player deleted');
        router.refresh();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete player');
      }
    } catch {
      toast.error('Something went wrong');
    }
  };

  const handleToggleCheckin = useCallback(async (player: Player) => {
    // Use session date (6 AM cutoff) instead of today
    const dateToUse = sessionDateStr || getSessionDateString();
    const isCheckedIn = checkedInPlayers.has(player.id);

    setCheckingIn(player.id);
    try {
      const response = await fetch('/api/admin/checkins', {
        method: isCheckedIn ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: player.id,
          organization_id: orgId,
          date: dateToUse,
        }),
      });

      if (response.ok) {
        const newSet = new Set(checkedInPlayers);
        if (isCheckedIn) {
          newSet.delete(player.id);
          toast.success(`${player.full_name} checked out`);
        } else {
          newSet.add(player.id);
          toast.success(`${player.full_name} checked in!`);
        }
        setCheckedInPlayers(newSet);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update check-in');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setCheckingIn(null);
    }
  }, [sessionDateStr, checkedInPlayers, orgId]);

  const handleSaveRating = async () => {
    if (!selectedPlayer) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: selectedPlayer.id,
          organization_id: orgId,
          rating_stars: selectedRating,
        }),
      });

      if (response.ok) {
        toast.success('Rating saved!');
        setSelectedPlayer(null);
        router.refresh();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to save rating');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  const ratedCount = players.filter((p) => p.rating !== null).length;
  const avgRating = players.length > 0
    ? (players.reduce((sum, p) => sum + (p.rating || 0), 0) / ratedCount || 0).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Players</h1>
            <p className="text-muted-foreground mt-1">
              {players.length} players with completed profiles
            </p>
          </div>
          <Button onClick={() => setShowAddPlayer(true)} size="sm">
            + Add Player
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold">{players.length}</p>
              <p className="text-xs text-muted-foreground">Total Players</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold">{ratedCount}</p>
              <p className="text-xs text-muted-foreground">Rated</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold">{avgRating}</p>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <Input
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            <Button
              variant={filterPosition === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterPosition(null)}
            >
              All
            </Button>
            {Object.entries(positionLabels).map(([key, value]) => (
              <Button
                key={key}
                variant={filterPosition === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterPosition(key)}
              >
                {value.emoji} {key}
              </Button>
            ))}
          </div>
        </div>

        {/* Notice about private ratings */}
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg">
          <div className="flex gap-3">
            <span className="text-xl">🔒</span>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Ratings are private
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Only admins can see player ratings. Players never see their own or others&apos; ratings.
              </p>
            </div>
          </div>
        </div>

        {/* Players List */}
        {filterPosition ? (
          <div className="space-y-2">
            {filteredPlayers.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                onRate={() => handleOpenRating(player)}
                onEdit={!player.user_id ? () => handleOpenEdit(player) : undefined}
                onDelete={!player.user_id ? () => handleDeletePlayer(player) : undefined}
                onToggleCheckin={() => handleToggleCheckin(player)}
                isCheckedIn={checkedInPlayers.has(player.id)}
                isCheckingIn={checkingIn === player.id}
              />
            ))}
            {filteredPlayers.length === 0 && (
              <Card className="py-12 text-center">
                <CardContent>
                  <p className="text-muted-foreground">No players found</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {(['GK', 'DF', 'MID', 'ST'] as const).map((position) => {
              const posPlayers = groupedPlayers[position] || [];
              if (posPlayers.length === 0) return null;

              const posInfo = positionLabels[position];

              return (
                <div key={position}>
                  <h2 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <span>{posInfo.emoji}</span>
                    {posInfo.label}s ({posPlayers.length})
                  </h2>
                  <div className="space-y-2">
                    {posPlayers.map((player) => (
                      <PlayerCard
                        key={player.id}
                        player={player}
                        onRate={() => handleOpenRating(player)}
                        onEdit={!player.user_id ? () => handleOpenEdit(player) : undefined}
                        onDelete={!player.user_id ? () => handleDeletePlayer(player) : undefined}
                        onToggleCheckin={() => handleToggleCheckin(player)}
                        isCheckedIn={checkedInPlayers.has(player.id)}
                        isCheckingIn={checkingIn === player.id}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rating Dialog - Mobile Optimized */}
      <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rate Player</DialogTitle>
            <DialogDescription>
              Set skill rating for {selectedPlayer?.full_name}
            </DialogDescription>
          </DialogHeader>

          {selectedPlayer && (
            <div className="py-4">
              {/* Player Info */}
              <div className="flex items-center gap-3 mb-6 p-3 bg-muted/50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-medium flex-shrink-0">
                  {selectedPlayer.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-base truncate">{selectedPlayer.full_name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                    <span>{selectedPlayer.age} yrs</span>
                    <Badge className={positionLabels[selectedPlayer.main_position]?.color} variant="secondary">
                      {selectedPlayer.main_position}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Star Rating - Larger touch targets for mobile */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">Skill Level</p>
                <div className="flex justify-center gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedRating(star);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        setSelectedRating(star);
                      }}
                      className={cn(
                        'w-14 h-14 sm:w-12 sm:h-12 rounded-xl border-2 flex items-center justify-center text-2xl transition-colors touch-manipulation',
                        star <= selectedRating
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/30'
                          : 'border-muted'
                      )}
                    >
                      {star <= selectedRating ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-sm font-medium">
                  {selectedRating === 1 && 'Beginner'}
                  {selectedRating === 2 && 'Below Average'}
                  {selectedRating === 3 && 'Average'}
                  {selectedRating === 4 && 'Above Average'}
                  {selectedRating === 5 && 'Expert'}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedPlayer(null)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveRating}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              {isSaving ? 'Saving...' : 'Save Rating'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Player Dialog - Mobile Optimized */}
      <Dialog open={showAddPlayer} onOpenChange={setShowAddPlayer}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Player</DialogTitle>
            <DialogDescription>
              Manually add a player who hasn&apos;t signed up yet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="playerName">Full Name *</Label>
              <Input
                id="playerName"
                placeholder="John Smith"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="playerAge">Age *</Label>
              <Input
                id="playerAge"
                type="number"
                placeholder="25"
                value={newPlayerAge}
                onChange={(e) => setNewPlayerAge(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Main Position *</Label>
              <Select value={newPlayerPosition} onValueChange={setNewPlayerPosition}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(positionLabels).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.emoji} {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Alternate Position</Label>
              <Select value={newPlayerAltPosition} onValueChange={setNewPlayerAltPosition}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {Object.entries(positionLabels).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.emoji} {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Initial Skill Rating</Label>
              <div className="flex justify-center gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewPlayerRating(star)}
                    className={cn(
                      'w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg transition-all',
                      'hover:scale-110 active:scale-95',
                      star <= newPlayerRating
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/30'
                        : 'border-muted hover:border-amber-200'
                    )}
                  >
                    {star <= newPlayerRating ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
              <p className="text-center text-xs text-muted-foreground mt-2">
                {newPlayerRating === 1 && 'Beginner'}
                {newPlayerRating === 2 && 'Below Average'}
                {newPlayerRating === 3 && 'Average'}
                {newPlayerRating === 4 && 'Above Average'}
                {newPlayerRating === 5 && 'Expert'}
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddPlayer(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPlayer}
              disabled={isAddingPlayer}
              className="w-full sm:w-auto"
            >
              {isAddingPlayer ? 'Adding...' : 'Add Player'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Player Dialog - Mobile Optimized */}
      <Dialog open={!!editingPlayer} onOpenChange={() => setEditingPlayer(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
            <DialogDescription>
              Update player information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="editName">Full Name *</Label>
              <Input
                id="editName"
                placeholder="John Smith"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="editAge">Age *</Label>
              <Input
                id="editAge"
                type="number"
                placeholder="25"
                value={editAge}
                onChange={(e) => setEditAge(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Main Position *</Label>
              <Select value={editPosition} onValueChange={setEditPosition}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(positionLabels).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.emoji} {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Alternate Position</Label>
              <Select value={editAltPosition} onValueChange={setEditAltPosition}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {Object.entries(positionLabels).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.emoji} {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingPlayer(null)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditPlayer}
              disabled={isEditing}
              className="w-full sm:w-auto"
            >
              {isEditing ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlayerCard({
  player,
  onRate,
  onEdit,
  onDelete,
  onToggleCheckin,
  isCheckedIn,
  isCheckingIn,
}: {
  player: Player;
  onRate: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleCheckin?: () => void;
  isCheckedIn?: boolean;
  isCheckingIn?: boolean;
}) {
  const posInfo = positionLabels[player.main_position];
  const isAdminCreated = !player.user_id;

  return (
    <Card className={isAdminCreated ? 'border-dashed' : ''}>
      <CardContent className="py-2 px-3">
        {/* Two-row layout for mobile */}
        <div className="flex flex-col gap-2">
          {/* Row 1: Avatar, Name, Position, Rating */}
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0',
              isAdminCreated ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-muted'
            )}>
              {player.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate">{player.full_name}</p>
                {isCheckedIn && (
                  <span className="text-green-600 text-xs">✓</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn('px-1 py-0.5 rounded text-[10px]', posInfo?.color)}>
                  {posInfo?.emoji} {player.main_position}
                </span>
                <span>{player.age}y</span>
                {isAdminCreated && (
                  <span className="text-purple-500 text-[10px]">Manual</span>
                )}
              </div>
            </div>
            {/* Rating stars - compact */}
            <div className="flex-shrink-0">
              {player.rating ? (
                <span className="text-amber-500 text-xs" title={`${player.rating}/5`}>
                  {'★'.repeat(player.rating)}{'☆'.repeat(5 - player.rating)}
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground">No rating</span>
              )}
            </div>
          </div>

          {/* Row 2: Action buttons - compact */}
          <div className="flex items-center gap-1.5 justify-end">
            {onToggleCheckin && (
              <Button
                variant={isCheckedIn ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-[11px] px-2 touch-manipulation"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleCheckin();
                }}
                disabled={isCheckingIn}
              >
                {isCheckingIn ? '...' : isCheckedIn ? 'Out' : 'In'}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] px-2 touch-manipulation"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRate();
              }}
            >
              ⭐ Rate
            </Button>

            {isAdminCreated && onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 touch-manipulation"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit();
                }}
              >
                ✏️
              </Button>
            )}
            {isAdminCreated && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 touch-manipulation"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
              >
                🗑️
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
