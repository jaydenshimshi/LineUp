'use client';

/**
 * Team assignment card component - displays player's team assignment
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type TeamColor = 'red' | 'blue' | 'yellow' | 'sub';
type PositionType = 'GK' | 'DF' | 'MID' | 'ST';

interface TeamMember {
  id: string;
  name: string;
  position: PositionType;
}

interface TeamCardProps {
  teamColor: TeamColor;
  assignedRole: PositionType;
  teammates: TeamMember[];
  subs: TeamMember[];
}

const TEAM_COLORS: Record<TeamColor, { bg: string; text: string; border: string; label: string }> = {
  red: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    label: 'RED',
  },
  blue: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    label: 'BLUE',
  },
  yellow: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-300',
    label: 'YELLOW',
  },
  sub: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
    label: 'SUBSTITUTE',
  },
};

const POSITION_LABELS: Record<PositionType, string> = {
  GK: 'Goalkeeper',
  DF: 'Defender',
  MID: 'Midfielder',
  ST: 'Striker',
};

function formatPlayerName(fullName: string): string {
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) {
    return parts[0];
  }
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  return `${firstName.charAt(0)}. ${lastName}`;
}

export function TeamCard({ teamColor, assignedRole, teammates, subs }: TeamCardProps) {
  const colorConfig = TEAM_COLORS[teamColor];

  return (
    <Card className={cn('border-2', colorConfig.border)}>
      <CardHeader className={cn('pb-3', colorConfig.bg)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Your Team</CardTitle>
          <Badge className={cn('font-bold', colorConfig.bg, colorConfig.text)}>
            {colorConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Assigned Role */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Your Role:</span>
          <Badge variant="secondary" className="font-medium">
            {POSITION_LABELS[assignedRole]} ({assignedRole})
          </Badge>
        </div>

        {/* Teammates */}
        {teammates.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Teammates:</p>
            <ul className="space-y-1">
              {teammates.map((member) => (
                <li
                  key={member.id}
                  className="text-sm text-gray-600 flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  {formatPlayerName(member.name)}
                  <span className="text-gray-400">({member.position})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Subs */}
        {subs.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">Substitutes:</p>
            <ul className="space-y-1">
              {subs.map((member) => (
                <li
                  key={member.id}
                  className="text-sm text-gray-500 flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                  {formatPlayerName(member.name)}
                  <span className="text-gray-400">({member.position})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Empty state for subs */}
        {teamColor === 'sub' && (
          <p className="text-sm text-gray-500 italic">
            You&apos;re on the substitute list for today. You may be called in if needed.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Placeholder shown when teams haven't been published yet
 */
export function TeamCardPending() {
  return (
    <Card className="border-2 border-dashed border-gray-300">
      <CardContent className="py-8 text-center">
        <p className="text-gray-500 font-medium">Team assignments pending</p>
        <p className="text-sm text-gray-400 mt-1">
          Check back after the admin publishes teams
        </p>
      </CardContent>
    </Card>
  );
}
