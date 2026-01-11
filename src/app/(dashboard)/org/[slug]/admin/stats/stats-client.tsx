'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface PlayerStat {
  id: string;
  name: string;
  position: string;
  skillLevel: number | null;
  memberSince: string;
  attendanceCount: number;
  attendanceRate: number;
  gamesPlayed: number;
}

interface OrgStats {
  totalPlayers: number;
  totalGames: number;
  avgAttendance: number;
  topAttendees: PlayerStat[];
}

interface StatsClientProps {
  orgName: string;
  playerStats: PlayerStat[];
  orgStats: OrgStats;
}

const positionLabels: Record<string, string> = {
  GK: 'Goalkeeper',
  DF: 'Defender',
  MID: 'Midfielder',
  ST: 'Striker',
};

const positionColors: Record<string, string> = {
  GK: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  DF: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  MID: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ST: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function StatsClient({ orgName, playerStats, orgStats }: StatsClientProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'attendance' | 'games'>('attendance');

  const filteredPlayers = playerStats
    .filter((player) =>
      player.name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'attendance':
          return b.attendanceRate - a.attendanceRate;
        case 'games':
          return b.gamesPlayed - a.gamesPlayed;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const summaryCards = [
    {
      label: 'Total Players',
      value: orgStats.totalPlayers,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Total Games',
      value: orgStats.totalGames,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Avg Attendance',
      value: `${orgStats.avgAttendance}%`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto py-6 px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Player Statistics</h1>
          <p className="text-muted-foreground mt-1">
            {orgName} - Last 3 months
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {summaryCards.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <div className={stat.color}>{stat.icon}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Top Attendees */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              Top Attendees
            </CardTitle>
            <CardDescription>Players with highest attendance rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {orgStats.topAttendees.map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50"
                >
                  <span className="text-lg font-bold text-primary">
                    #{index + 1}
                  </span>
                  <span className="font-medium">{player.name}</span>
                  <Badge variant="secondary">{player.attendanceRate}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Player List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>All Players</CardTitle>
                <CardDescription>Detailed statistics for each player</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search players..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-48"
                />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="attendance">Sort by Attendance</option>
                  <option value="games">Sort by Games</option>
                  <option value="name">Sort by Name</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredPlayers.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      {player.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium">{player.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          className={positionColors[player.position] || ''}
                        >
                          {positionLabels[player.position] || player.position}
                        </Badge>
                        {player.skillLevel && (
                          <span className="text-xs text-muted-foreground">
                            Skill: {player.skillLevel}/10
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-muted-foreground">Attendance</p>
                      <p className="font-semibold text-lg">{player.attendanceRate}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Check-ins</p>
                      <p className="font-semibold text-lg">{player.attendanceCount}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Games</p>
                      <p className="font-semibold text-lg">{player.gamesPlayed}</p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className="text-muted-foreground">Member Since</p>
                      <p className="font-medium">
                        {format(parseISO(player.memberSince), 'MMM yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {filteredPlayers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No players found matching your search.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
