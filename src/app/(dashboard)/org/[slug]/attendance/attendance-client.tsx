'use client';

import { format, parseISO } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CheckinRecord {
  date: string;
  status: string;
  created_at: string;
}

interface AttendanceClientProps {
  playerName: string;
  memberSince: string;
  stats: {
    totalCheckins: number;
    totalGames: number;
    attendanceRate: number;
    currentStreak: number;
    gamesPlayed: number;
  };
  checkinsByMonth: Record<string, CheckinRecord[]>;
}

export function AttendanceClient({
  playerName,
  memberSince,
  stats,
  checkinsByMonth,
}: AttendanceClientProps) {
  const statCards = [
    {
      label: 'Total Check-ins',
      value: stats.totalCheckins,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Attendance Rate',
      value: `${stats.attendanceRate}%`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Games Played',
      value: stats.gamesPlayed,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      label: 'Current Streak',
      value: stats.currentStreak,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        </svg>
      ),
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
  ];

  const months = Object.keys(checkinsByMonth).sort().reverse();

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto py-6 px-4 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Attendance History</h1>
          <p className="text-muted-foreground mt-1">
            {playerName} &middot; Member since {format(parseISO(memberSince), 'MMMM yyyy')}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.label} className="overflow-hidden">
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

        {/* Monthly History */}
        <Card>
          <CardHeader>
            <CardTitle>Check-in History</CardTitle>
            <CardDescription>Last 6 months of activity</CardDescription>
          </CardHeader>
          <CardContent>
            {months.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No check-in history yet.</p>
                <p className="text-sm mt-1">Your attendance will appear here after you check in for games.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {months.map((month) => {
                  const checkins = checkinsByMonth[month];
                  const monthDate = parseISO(`${month}-01`);
                  const checkedInCount = checkins.filter((c) => c.status === 'checked_in').length;

                  return (
                    <div key={month}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">
                          {format(monthDate, 'MMMM yyyy')}
                        </h3>
                        <Badge variant="secondary">
                          {checkedInCount} check-in{checkedInCount !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {/* Calendar-like display */}
                        {checkins.map((checkin) => {
                          const date = parseISO(checkin.date);
                          const isCheckedIn = checkin.status === 'checked_in';

                          return (
                            <div
                              key={checkin.date}
                              className={`
                                aspect-square rounded-lg flex flex-col items-center justify-center text-xs
                                ${
                                  isCheckedIn
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                }
                              `}
                              title={`${format(date, 'MMM d')} - ${isCheckedIn ? 'Checked in' : 'Checked out'}`}
                            >
                              <span className="font-semibold">{format(date, 'd')}</span>
                              <span className="text-[10px] opacity-75">
                                {isCheckedIn ? 'IN' : 'OUT'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Explanation */}
        <div className="mt-6 p-4 bg-muted/50 rounded-xl">
          <p className="text-sm text-muted-foreground text-center">
            Your attendance helps admins plan better games and ensures fair team balancing.
          </p>
        </div>
      </div>
    </div>
  );
}
