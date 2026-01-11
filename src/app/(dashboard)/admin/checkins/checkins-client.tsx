'use client';

/**
 * Admin check-ins client component
 */

import { useState, useEffect } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, UserPlus, UserMinus, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface PlayerCheckin {
  id: string;
  playerId: string;
  playerName: string;
  mainPosition: string;
  altPosition: string | null;
  status: 'checked_in' | 'checked_out';
  checkinTime: string;
}

interface AllPlayer {
  id: string;
  full_name: string;
  main_position: string;
  alt_position: string | null;
}

interface CheckinsClientProps {
  initialDate: Date;
  initialCheckins: PlayerCheckin[];
  allPlayers: AllPlayer[];
}

const MINIMUM_PLAYERS = 6;

export function CheckinsClient({
  initialDate,
  initialCheckins,
  allPlayers,
}: CheckinsClientProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [checkins, setCheckins] = useState<PlayerCheckin[]>(initialCheckins);
  const [isLoading, setIsLoading] = useState(false);
  const [addPlayerDialogOpen, setAddPlayerDialogOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  const dateString = format(selectedDate, 'yyyy-MM-dd');
  const checkedInCount = checkins.filter((c) => c.status === 'checked_in').length;
  const isEligible = checkedInCount >= MINIMUM_PLAYERS;

  // Get players not checked in
  const checkedInIds = new Set(checkins.map((c) => c.playerId));
  const availablePlayers = allPlayers.filter((p) => !checkedInIds.has(p.id));

  // Subscribe to real-time updates
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('admin-checkins-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkins',
          filter: `date=eq.${dateString}`,
        },
        () => {
          // Refresh data on any change
          fetchCheckins();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateString]);

  async function fetchCheckins() {
    const supabase = createClient();

    const { data } = await supabase
      .from('checkins')
      .select(`
        id,
        player_id,
        status,
        created_at,
        players!inner(id, full_name, main_position, alt_position)
      `)
      .eq('date', dateString)
      .order('created_at', { ascending: false });

    if (data) {
      interface CheckinRow {
        id: string;
        player_id: string;
        status: string;
        created_at: string;
        players: {
          id: string;
          full_name: string;
          main_position: string;
          alt_position: string | null;
        };
      }
      const typedData = data as unknown as CheckinRow[];
      setCheckins(
        typedData.map((c) => ({
          id: c.id,
          playerId: c.players.id,
          playerName: c.players.full_name,
          mainPosition: c.players.main_position,
          altPosition: c.players.alt_position,
          status: c.status as 'checked_in' | 'checked_out',
          checkinTime: c.created_at,
        }))
      );
    }
  }

  function changeDate(days: number) {
    const newDate = days > 0 ? addDays(selectedDate, days) : subDays(selectedDate, Math.abs(days));
    setSelectedDate(newDate);
    setIsLoading(true);

    // Fetch new data for the date
    const supabase = createClient();
    const newDateString = format(newDate, 'yyyy-MM-dd');

    supabase
      .from('checkins')
      .select(`
        id,
        player_id,
        status,
        created_at,
        players!inner(id, full_name, main_position, alt_position)
      `)
      .eq('date', newDateString)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          interface CheckinRow {
            id: string;
            player_id: string;
            status: string;
            created_at: string;
            players: {
              id: string;
              full_name: string;
              main_position: string;
              alt_position: string | null;
            };
          }
          const typedData = data as unknown as CheckinRow[];
          setCheckins(
            typedData.map((c) => ({
              id: c.id,
              playerId: c.players.id,
              playerName: c.players.full_name,
              mainPosition: c.players.main_position,
              altPosition: c.players.alt_position,
              status: c.status as 'checked_in' | 'checked_out',
              checkinTime: c.created_at,
            }))
          );
        } else {
          setCheckins([]);
        }
        setIsLoading(false);
      });
  }

  async function addPlayerCheckin() {
    if (!selectedPlayerId) return;

    const supabase = createClient();

    const { error } = await supabase.from('checkins').upsert(
      {
        player_id: selectedPlayerId,
        date: dateString,
        status: 'checked_in',
      } as never,
      { onConflict: 'player_id,date' }
    );

    if (error) {
      console.error('Error adding check-in:', error);
      return;
    }

    setAddPlayerDialogOpen(false);
    setSelectedPlayerId('');
    fetchCheckins();
  }

  async function removePlayerCheckin(playerId: string) {
    const supabase = createClient();

    const { error } = await supabase
      .from('checkins')
      .delete()
      .eq('player_id', playerId)
      .eq('date', dateString);

    if (error) {
      console.error('Error removing check-in:', error);
      return;
    }

    fetchCheckins();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Check-ins Management</h1>
        <p className="text-gray-500">View and manage player check-ins by date</p>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-4">
              <Calendar className="h-5 w-5 text-gray-500" />
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {format(selectedDate, 'EEEE, MMMM d')}
                </p>
                <p className="text-sm text-gray-500">
                  {format(selectedDate, 'yyyy')}
                </p>
              </div>
            </div>

            <Button variant="outline" size="icon" onClick={() => changeDate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{checkedInCount}</p>
              <p className="text-sm text-gray-500">Checked In</p>
            </div>
            <div className="h-10 w-px bg-gray-200" />
            <div className="text-center">
              <Badge variant={isEligible ? 'default' : 'destructive'}>
                {isEligible ? 'Game Eligible' : 'Not Enough Players'}
              </Badge>
              <p className="text-xs text-gray-500 mt-1">
                Min: {MINIMUM_PLAYERS} players
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checked-in Players */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Checked-in Players</CardTitle>
          <Dialog open={addPlayerDialogOpen} onOpenChange={setAddPlayerDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Player
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Player Check-in</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a player" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePlayers.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        All players checked in
                      </SelectItem>
                    ) : (
                      availablePlayers.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.full_name} ({player.main_position})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  onClick={addPlayerCheckin}
                  disabled={!selectedPlayerId}
                  className="w-full"
                >
                  Add Check-in
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : checkins.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No players checked in for this date
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Checked In</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkins.map((checkin) => (
                    <TableRow key={checkin.id}>
                      <TableCell className="font-medium">
                        {checkin.playerName}
                      </TableCell>
                      <TableCell>
                        {checkin.mainPosition}
                        {checkin.altPosition && ` / ${checkin.altPosition}`}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(checkin.checkinTime), 'h:mm a')}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            checkin.status === 'checked_in'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-gray-50 text-gray-700'
                          )}
                        >
                          {checkin.status === 'checked_in' ? 'Playing' : 'Not Playing'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePlayerCheckin(checkin.playerId)}
                          title="Remove check-in"
                        >
                          <UserMinus className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/teams?date=${dateString}`)}
              disabled={!isEligible}
            >
              Generate Teams for This Date
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedDate(new Date())}
            >
              Go to Today
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
