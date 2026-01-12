/**
 * Admin player ratings page
 */

import { createClient } from '@/lib/supabase/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RATING_LABELS } from '@/lib/validations/rating';
import { RatingsClient } from './ratings-client';
import type { Metadata } from 'next';
import type { PositionType } from '@/types';

export const dynamic = 'force-dynamic';

interface PlayerWithRating {
  id: string;
  full_name: string;
  age: number;
  main_position: PositionType;
  alt_position: PositionType | null;
  rating: { id: string; rating_stars: number; notes: string | null }[] | null;
}

export const metadata: Metadata = {
  title: 'Player Ratings',
  description: 'Assign skill ratings to players',
};

export default async function AdminRatingsPage() {
  const supabase = await createClient();

  // Get all players with their ratings
  const { data: playersData, error } = await (supabase
    .from('players')
    .select(
      `
      *,
      rating:player_admin_ratings (id, rating_stars, notes, rated_by_admin_id)
    `
    ) as any)
    .eq('profile_completed', true)
    .order('full_name');
  const players = playersData as PlayerWithRating[] | null;

  if (error) {
    console.error('Error fetching players:', error);
  }

  // Transform data for client component
  const playersWithRatings =
    players?.map((player) => {
      const ratingData = player.rating;
      const rating = Array.isArray(ratingData) ? ratingData[0] : null;
      return {
        id: player.id,
        full_name: player.full_name,
        age: player.age,
        main_position: player.main_position,
        alt_position: player.alt_position,
        rating_stars: rating?.rating_stars || null,
        rating_notes: rating?.notes || null,
      };
    }) || [];

  // Calculate stats
  const totalPlayers = playersWithRatings.length;
  const ratedPlayers = playersWithRatings.filter((p) => p.rating_stars).length;
  const unratedPlayers = totalPlayers - ratedPlayers;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Player Ratings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Assign skill ratings (1-5 stars) to players. These ratings are private
          and used for balanced team generation.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Players</CardDescription>
            <CardTitle className="text-2xl">{totalPlayers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rated</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {ratedPlayers}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unrated</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">
              {unratedPlayers}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Rating Legend */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Rating Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {[1, 2, 3, 4, 5].map((rating) => (
              <div key={rating} className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={
                        star <= rating ? 'text-yellow-500' : 'text-gray-300'
                      }
                    >
                      *
                    </span>
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  {RATING_LABELS[rating]}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Players List */}
      <RatingsClient players={playersWithRatings} />
    </div>
  );
}
