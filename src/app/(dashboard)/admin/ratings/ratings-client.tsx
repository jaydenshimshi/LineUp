'use client';

/**
 * Client component for ratings page with interactive rating forms
 */

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { POSITION_LABELS } from '@/lib/validations/profile';
import { RatingForm } from '@/components/admin/rating-form';
import type { PositionType } from '@/types';

interface PlayerWithRating {
  id: string;
  full_name: string;
  age: number;
  main_position: PositionType;
  alt_position: PositionType | null;
  rating_stars: number | null;
  rating_notes: string | null;
}

interface RatingsClientProps {
  players: PlayerWithRating[];
}

export function RatingsClient({ players }: RatingsClientProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithRating | null>(
    null
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Players</CardTitle>
          <CardDescription>
            Click on a player to assign or update their rating
          </CardDescription>
        </CardHeader>
        <CardContent>
          {players.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {players.map((player) => (
                <button
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  className="text-left p-4 rounded-lg border hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{player.full_name}</p>
                      <p className="text-sm text-gray-500">Age: {player.age}</p>
                    </div>
                    {player.rating_stars ? (
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={
                              star <= player.rating_stars!
                                ? 'text-yellow-500'
                                : 'text-gray-300'
                            }
                          >
                            *
                          </span>
                        ))}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600">
                        Unrated
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Badge variant="secondary">
                      {POSITION_LABELS[player.main_position]}
                    </Badge>
                    {player.alt_position && (
                      <Badge variant="outline">{player.alt_position}</Badge>
                    )}
                  </div>
                  {player.rating_notes && (
                    <p className="mt-2 text-xs text-gray-500 truncate">
                      {player.rating_notes}
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No players with completed profiles yet.
            </p>
          )}
        </CardContent>
      </Card>

      {selectedPlayer && (
        <RatingForm
          playerId={selectedPlayer.id}
          playerName={selectedPlayer.full_name}
          currentRating={selectedPlayer.rating_stars || undefined}
          currentNotes={selectedPlayer.rating_notes || undefined}
          isOpen={true}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </>
  );
}
