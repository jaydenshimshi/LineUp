'use client';

/**
 * Players Client Component
 * Beautiful UI for viewing players and managing ratings
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  user_id: string;
  rating: number | null;
}

interface PlayersClientProps {
  orgId: string;
  orgSlug: string;
  players: Player[];
}

const positionLabels: Record<string, { label: string; emoji: string; color: string }> = {
  GK: { label: 'Goalkeeper', emoji: '🧤', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  DF: { label: 'Defender', emoji: '🛡️', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  MID: { label: 'Midfielder', emoji: '⚙️', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  ST: { label: 'Striker', emoji: '⚡', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export function PlayersClient({ orgId, orgSlug, players }: PlayersClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(3);
  const [isSaving, setIsSaving] = useState(false);
  const [filterPosition, setFilterPosition] = useState<string | null>(null);

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

  const handleOpenRating = (player: Player) => {
    setSelectedPlayer(player);
    setSelectedRating(player.rating || 3);
  };

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
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Players</h1>
          <p className="text-muted-foreground mt-1">
            {players.length} players with completed profiles
          </p>
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
          <div className="space-y-3">
            {filteredPlayers.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                onRate={() => handleOpenRating(player)}
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
          <div className="space-y-8">
            {(['GK', 'DF', 'MID', 'ST'] as const).map((position) => {
              const posPlayers = groupedPlayers[position] || [];
              if (posPlayers.length === 0) return null;

              const posInfo = positionLabels[position];

              return (
                <div key={position}>
                  <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <span>{posInfo.emoji}</span>
                    {posInfo.label}s ({posPlayers.length})
                  </h2>
                  <div className="space-y-2">
                    {posPlayers.map((player) => (
                      <PlayerCard
                        key={player.id}
                        player={player}
                        onRate={() => handleOpenRating(player)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rating Dialog */}
      <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate Player</DialogTitle>
            <DialogDescription>
              Set skill rating for {selectedPlayer?.full_name}
            </DialogDescription>
          </DialogHeader>

          {selectedPlayer && (
            <div className="py-6">
              {/* Player Info */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-xl font-medium">
                  {selectedPlayer.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-lg">{selectedPlayer.full_name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{selectedPlayer.age} years old</span>
                    <span>•</span>
                    <Badge className={positionLabels[selectedPlayer.main_position]?.color} variant="secondary">
                      {selectedPlayer.main_position}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Star Rating */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">Skill Level</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSelectedRating(star)}
                      className={cn(
                        'w-12 h-12 rounded-xl border-2 flex items-center justify-center text-2xl transition-all',
                        'hover:scale-110 active:scale-95',
                        star <= selectedRating
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/30'
                          : 'border-muted hover:border-amber-200'
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPlayer(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRating} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Rating'}
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
}: {
  player: Player;
  onRate: () => void;
}) {
  const posInfo = positionLabels[player.main_position];

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
              {player.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <p className="font-medium">{player.full_name}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{player.age} yrs</span>
                <Badge className={posInfo?.color} variant="secondary">
                  {posInfo?.emoji} {player.main_position}
                </Badge>
                {player.alt_position && (
                  <Badge variant="outline" className="text-xs">
                    +{player.alt_position}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Rating Display */}
            {player.rating ? (
              <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-lg">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-sm">
                    {i < player.rating! ? '⭐' : '☆'}
                  </span>
                ))}
              </div>
            ) : (
              <Badge variant="outline" className="text-xs">
                Not rated
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={onRate}>
              {player.rating ? 'Edit' : 'Rate'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
