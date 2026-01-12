'use client';

/**
 * Players Client Component
 * Mobile-optimized with inline dropdowns instead of dialogs
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';

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
}

interface PlayersClientProps {
  orgId: string;
  players: Player[];
  todayCheckins?: string[];
  adminId?: string;
  sessionDate?: string;
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

const ratingLabels: Record<number, string> = {
  1: 'Beginner',
  2: 'Below Avg',
  3: 'Average',
  4: 'Above Avg',
  5: 'Expert',
};

// Inline Rating Selector Component
function RatingSelector({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (rating: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value || ''}
        onChange={(e) => {
          const newRating = parseInt(e.target.value);
          if (newRating >= 1 && newRating <= 5) {
            onChange(newRating);
          }
        }}
        disabled={disabled}
        className={cn(
          "w-full h-8 appearance-none bg-transparent cursor-pointer",
          "outline-none border rounded-md px-2 pr-7",
          "text-[13px] font-medium",
          value ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400" : "border-gray-300 text-gray-500",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <option value="">Rate</option>
        {[1, 2, 3, 4, 5].map((r) => (
          <option key={r} value={r}>
            {'★'.repeat(r)}{'☆'.repeat(5 - r)} {ratingLabels[r]}
          </option>
        ))}
      </select>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <ChevronDownIcon className="w-3 h-3 text-gray-400" />
      </div>
    </div>
  );
}

// Inline Action Selector for Edit/Delete
function ActionSelector({
  onEdit,
  onDelete,
  disabled,
}: {
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const action = e.target.value;
    if (action === 'edit') {
      onEdit();
    } else if (action === 'delete') {
      onDelete();
    }
    // Reset the select
    e.target.value = '';
  };

  return (
    <select
      onChange={handleChange}
      disabled={disabled}
      defaultValue=""
      className={cn(
        "h-8 appearance-none bg-transparent cursor-pointer",
        "outline-none border border-gray-300 rounded-md px-2 pr-1",
        "text-[13px] text-gray-600",
        "disabled:opacity-50"
      )}
    >
      <option value="" disabled>...</option>
      <option value="edit">✏️ Edit</option>
      <option value="delete">🗑️ Delete</option>
    </select>
  );
}

export function PlayersClient({ orgId, players, todayCheckins = [], sessionDate: initialSessionDate }: PlayersClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPosition, setFilterPosition] = useState<string | null>(null);
  const [sessionDateStr, setSessionDateStr] = useState(initialSessionDate || '');

  // Player ratings state (local updates)
  const [playerRatings, setPlayerRatings] = useState<Record<string, number | null>>(() => {
    const ratings: Record<string, number | null> = {};
    players.forEach(p => {
      ratings[p.id] = p.rating;
    });
    return ratings;
  });

  // Saving states
  const [savingRating, setSavingRating] = useState<string | null>(null);

  // Check-in state
  const [checkedInPlayers, setCheckedInPlayers] = useState<Set<string>>(new Set(todayCheckins));
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  // Add player state (inline form)
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAge, setNewPlayerAge] = useState('');
  const [newPlayerPosition, setNewPlayerPosition] = useState('');
  const [newPlayerAltPosition, setNewPlayerAltPosition] = useState('');
  const [newPlayerRating, setNewPlayerRating] = useState<number>(3);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);

  // Edit player state (inline)
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editAltPosition, setEditAltPosition] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Calculate session date on mount
  useEffect(() => {
    if (!initialSessionDate) {
      setSessionDateStr(getSessionDateString());
    }
  }, [initialSessionDate]);

  const filteredPlayers = players.filter((player) => {
    const matchesSearch = player.full_name.toLowerCase().includes(searchQuery.toLowerCase());
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

  // Handle rating change with auto-save
  const handleRatingChange = useCallback(async (playerId: string, newRating: number) => {
    setSavingRating(playerId);
    setPlayerRatings(prev => ({ ...prev, [playerId]: newRating }));

    try {
      const response = await fetch('/api/admin/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: playerId,
          organization_id: orgId,
          rating_stars: newRating,
        }),
      });

      if (response.ok) {
        toast.success('Rating saved');
      } else {
        toast.error('Failed to save rating');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSavingRating(null);
    }
  }, [orgId]);

  // Handle check-in toggle
  const handleToggleCheckin = useCallback(async (player: Player) => {
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
          toast.success('Checked out');
        } else {
          newSet.add(player.id);
          toast.success('Checked in');
        }
        setCheckedInPlayers(newSet);
      } else {
        toast.error('Failed to update');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setCheckingIn(null);
    }
  }, [sessionDateStr, checkedInPlayers, orgId]);

  // Handle add player
  const handleAddPlayer = async () => {
    if (!newPlayerName.trim() || !newPlayerAge || !newPlayerPosition) {
      toast.error('Please fill required fields');
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
        toast.success('Player added');
        setShowAddForm(false);
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

  // Handle edit player
  const handleStartEdit = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditName(player.full_name);
    setEditAge(player.age.toString());
    setEditPosition(player.main_position);
    setEditAltPosition(player.alt_position || '');
  };

  const handleSaveEdit = async () => {
    if (!editingPlayerId || !editName.trim() || !editAge || !editPosition) {
      toast.error('Please fill required fields');
      return;
    }

    setIsEditing(true);
    try {
      const response = await fetch('/api/admin/players', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: editingPlayerId,
          organization_id: orgId,
          full_name: editName.trim(),
          age: parseInt(editAge),
          main_position: editPosition,
          alt_position: editAltPosition || null,
        }),
      });

      if (response.ok) {
        toast.success('Player updated');
        setEditingPlayerId(null);
        router.refresh();
      } else {
        toast.error('Failed to update');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsEditing(false);
    }
  };

  // Handle delete player
  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm('Delete this player?')) return;

    try {
      const response = await fetch(`/api/admin/players?player_id=${playerId}&organization_id=${orgId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Player deleted');
        router.refresh();
      } else {
        toast.error('Failed to delete');
      }
    } catch {
      toast.error('Something went wrong');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-3 px-3 max-w-lg">
        {/* Header */}
        <div className="mb-3">
          <BackButton className="-ml-2 mb-1" />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">Players</h1>
              <p className="text-xs text-muted-foreground">{players.length} total</p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              variant={showAddForm ? 'outline' : 'default'}
            >
              {showAddForm ? 'Cancel' : '+ Add'}
            </Button>
          </div>
        </div>

        {/* Add Player Form (inline) */}
        {showAddForm && (
          <Card className="mb-3 border-dashed border-2 border-primary/50">
            <CardContent className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Name *</Label>
                  <Input
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="Full name"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Age *</Label>
                  <Input
                    type="number"
                    value={newPlayerAge}
                    onChange={(e) => setNewPlayerAge(e.target.value)}
                    placeholder="Age"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Position *</Label>
                  <select
                    value={newPlayerPosition}
                    onChange={(e) => setNewPlayerPosition(e.target.value)}
                    className="w-full h-8 border rounded-md px-2 text-sm"
                  >
                    <option value="">Select</option>
                    <option value="GK">🧤 Goalkeeper</option>
                    <option value="DF">🛡️ Defender</option>
                    <option value="MID">⚙️ Midfielder</option>
                    <option value="ST">⚡ Striker</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Alt Position</Label>
                  <select
                    value={newPlayerAltPosition}
                    onChange={(e) => setNewPlayerAltPosition(e.target.value)}
                    className="w-full h-8 border rounded-md px-2 text-sm text-muted-foreground"
                  >
                    <option value="">None</option>
                    <option value="GK">🧤 Goalkeeper</option>
                    <option value="DF">🛡️ Defender</option>
                    <option value="MID">⚙️ Midfielder</option>
                    <option value="ST">⚡ Striker</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Rating</Label>
                <select
                  value={newPlayerRating}
                  onChange={(e) => setNewPlayerRating(parseInt(e.target.value))}
                  className="w-full h-8 border rounded-md px-2 text-sm"
                >
                  {[1, 2, 3, 4, 5].map((r) => (
                    <option key={r} value={r}>{'★'.repeat(r)} {ratingLabels[r]}</option>
                  ))}
                </select>
              </div>
              <Button
                onClick={handleAddPlayer}
                disabled={isAddingPlayer}
                size="sm"
                className="w-full"
              >
                {isAddingPlayer ? 'Adding...' : 'Add Player'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="mb-3">
          <Input
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9"
          />
        </div>

        {/* Position Filter */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          <Button
            variant={filterPosition === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterPosition(null)}
            className="h-7 text-xs px-2 flex-shrink-0"
          >
            All
          </Button>
          {Object.entries(positionLabels).map(([pos, info]) => (
            <Button
              key={pos}
              variant={filterPosition === pos ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterPosition(pos)}
              className="h-7 text-xs px-2 flex-shrink-0"
            >
              {info.emoji} {pos}
            </Button>
          ))}
        </div>

        {/* Players List by Position */}
        <div className="space-y-4">
          {Object.entries(groupedPlayers).map(([position, positionPlayers]) => {
            const posInfo = positionLabels[position];
            return (
              <div key={position}>
                <div className="flex items-center gap-2 mb-2">
                  <span>{posInfo?.emoji}</span>
                  <span className="text-sm font-medium">{posInfo?.label}s ({positionPlayers.length})</span>
                </div>
                <div className="space-y-2">
                  {positionPlayers.map((player) => {
                    const isManual = !player.user_id;
                    const isCheckedIn = checkedInPlayers.has(player.id);
                    const isEditingThis = editingPlayerId === player.id;
                    const currentRating = playerRatings[player.id];

                    if (isEditingThis) {
                      // Edit mode - inline form
                      return (
                        <Card key={player.id} className="border-2 border-primary">
                          <CardContent className="p-3 space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Name"
                                className="h-8 text-sm col-span-2"
                              />
                              <Input
                                type="number"
                                value={editAge}
                                onChange={(e) => setEditAge(e.target.value)}
                                placeholder="Age"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={editPosition}
                                onChange={(e) => setEditPosition(e.target.value)}
                                className="h-8 border rounded-md px-2 text-sm"
                              >
                                <option value="GK">🧤 GK</option>
                                <option value="DF">🛡️ DF</option>
                                <option value="MID">⚙️ MID</option>
                                <option value="ST">⚡ ST</option>
                              </select>
                              <select
                                value={editAltPosition}
                                onChange={(e) => setEditAltPosition(e.target.value)}
                                className="h-8 border rounded-md px-2 text-sm text-muted-foreground"
                              >
                                <option value="">No alt position</option>
                                <option value="GK">🧤 Alt: GK</option>
                                <option value="DF">🛡️ Alt: DF</option>
                                <option value="MID">⚙️ Alt: MID</option>
                                <option value="ST">⚡ Alt: ST</option>
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleSaveEdit} disabled={isEditing} className="h-8 flex-1">
                                {isEditing ? '...' : 'Save'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingPlayerId(null)} className="h-8">
                                Cancel
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }

                    // Normal display mode
                    return (
                      <Card key={player.id} className={cn(isManual && "border-dashed")}>
                        <CardContent className="p-2.5">
                          {/* Row 1: Avatar, Name, Position, Rating Stars */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className={cn(
                              'w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0',
                              isManual ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-muted'
                            )}>
                              {player.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium truncate">{player.full_name}</p>
                                {isCheckedIn && <span className="text-green-600 text-xs">✓</span>}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Badge className={cn('h-4 text-[10px] px-1', posInfo?.color)}>
                                  {posInfo?.emoji} {position}
                                </Badge>
                                <span>{player.age}y</span>
                                {isManual && <span className="text-purple-500">Manual</span>}
                              </div>
                            </div>
                            {/* Star display */}
                            <div className="text-amber-500 text-xs flex-shrink-0">
                              {currentRating ? '★'.repeat(currentRating) + '☆'.repeat(5 - currentRating) : '—'}
                            </div>
                          </div>

                          {/* Row 2: Actions - Check-in, Rating Dropdown, Edit/Delete */}
                          <div className="flex items-center gap-1.5 justify-end">
                            <Button
                              variant={isCheckedIn ? 'default' : 'outline'}
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => handleToggleCheckin(player)}
                              disabled={checkingIn === player.id}
                            >
                              {checkingIn === player.id ? '...' : isCheckedIn ? 'Out' : 'In'}
                            </Button>

                            <div className="w-24">
                              <RatingSelector
                                value={currentRating}
                                onChange={(rating) => handleRatingChange(player.id, rating)}
                                disabled={savingRating === player.id}
                              />
                            </div>

                            {isManual && (
                              <ActionSelector
                                onEdit={() => handleStartEdit(player)}
                                onDelete={() => handleDeletePlayer(player.id)}
                              />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {filteredPlayers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No players found</p>
          </div>
        )}
      </div>
    </div>
  );
}
