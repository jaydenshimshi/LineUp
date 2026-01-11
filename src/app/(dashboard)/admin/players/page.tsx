/**
 * Admin players management page
 */

import { createClient } from '@/lib/supabase/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { POSITION_LABELS } from '@/lib/validations/profile';
import type { Metadata } from 'next';
import type { PositionType } from '@/types';

export const dynamic = 'force-dynamic';

interface PlayerWithRelations {
  id: string;
  full_name: string;
  age: number;
  main_position: PositionType;
  alt_position: PositionType | null;
  profile_completed: boolean;
  users: { email: string } | null;
  rating: { rating_stars: number; notes: string | null }[] | null;
}

export const metadata: Metadata = {
  title: 'Manage Players',
  description: 'View and manage all registered players',
};

export default async function AdminPlayersPage() {
  const supabase = await createClient();

  // Get all players with their user info and ratings
  const { data: playersData, error } = await supabase
    .from('players')
    .select(
      `
      *,
      users:user_id (email, role),
      rating:player_admin_ratings (rating_stars, notes)
    `
    )
    .order('full_name');
  const players = playersData as PlayerWithRelations[] | null;

  if (error) {
    console.error('Error fetching players:', error);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Manage Players
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          View all registered players and their information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Players</CardTitle>
          <CardDescription>
            {players?.length || 0} players registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {players && players.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player) => {
                  const ratingData = player.rating;
                  const rating = Array.isArray(ratingData) ? ratingData[0] : null;

                  return (
                    <TableRow key={player.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{player.full_name}</p>
                          <p className="text-sm text-gray-500">
                            {(player.users as { email: string })?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{player.age}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge variant="secondary">
                            {POSITION_LABELS[player.main_position]}
                          </Badge>
                          {player.alt_position && (
                            <Badge variant="outline">
                              {player.alt_position}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {rating ? (
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span
                                key={star}
                                className={
                                  star <= rating.rating_stars
                                    ? 'text-yellow-500'
                                    : 'text-gray-300'
                                }
                              >
                                *
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">
                            Not rated
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {player.profile_completed ? (
                          <Badge
                            variant="default"
                            className="bg-green-100 text-green-700"
                          >
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Incomplete</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No players registered yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
