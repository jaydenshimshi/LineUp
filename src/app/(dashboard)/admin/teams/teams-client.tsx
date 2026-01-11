'use client';

/**
 * Teams client component - Main team generation interface
 * Integrates with OR-Tools solver and handles publish/lock workflow
 */

import { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  RefreshCw,
  Save,
  Send,
  Lock,
  ArrowLeftRight,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

// Types
type PositionType = 'GK' | 'DF' | 'MID' | 'ST';
type TeamColor = 'RED' | 'BLUE' | 'YELLOW' | 'SUB';
type TeamRunStatus = 'draft' | 'published' | 'locked';

interface CheckedInPlayer {
  id: string;
  playerId: string;
  name: string;
  age: number;
  mainPosition: PositionType;
  altPosition: PositionType | null;
  rating: number;
  checkinStatus: 'checked_in' | 'checked_out';
}

interface PlayerAssignment {
  player_id: string;
  player_name: string;
  team: TeamColor;
  role: PositionType;
  bench_team: TeamColor | null;
  is_manual_override: boolean;
}

interface TeamMetrics {
  team: TeamColor;
  player_count: number;
  skill_sum: number;
  age_sum: number;
  skill_avg: number;
  age_avg: number;
  has_goalkeeper: boolean;
}

interface TeamRun {
  id: string;
  date: string;
  status: TeamRunStatus;
}

interface AuditLogEntry {
  id: string;
  action: string;
  details: string;
  timestamp: Date;
}

interface TeamsClientProps {
  initialDate: Date;
  initialPlayers: CheckedInPlayer[];
  existingTeamRun: TeamRun | null;
  adminId: string;
  auditLog: AuditLogEntry[];
}

const MINIMUM_PLAYERS = 6;

const POSITION_LABELS: Record<PositionType, string> = {
  GK: 'Goalkeeper',
  DF: 'Defender',
  MID: 'Midfielder',
  ST: 'Striker',
};

const TEAM_COLORS: Record<TeamColor, { bg: string; text: string; border: string }> = {
  RED: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  BLUE: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  YELLOW: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  SUB: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-500">
      {'★'.repeat(rating)}
      {'☆'.repeat(5 - rating)}
    </span>
  );
}

export function TeamsClient({
  initialDate,
  initialPlayers,
  existingTeamRun,
  adminId,
}: TeamsClientProps) {
  const router = useRouter();
  const [selectedDate] = useState(initialDate);
  const [players] = useState(initialPlayers);
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState<PositionType | 'all'>('all');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');

  // Team generation state
  const [assignments, setAssignments] = useState<PlayerAssignment[]>([]);
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [teamRunId, setTeamRunId] = useState<string | null>(existingTeamRun?.id || null);
  const [teamStatus, setTeamStatus] = useState<TeamRunStatus>(existingTeamRun?.status || 'draft');
  const [solveTimeMs, setSolveTimeMs] = useState<number | null>(null);

  // Dialogs
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [swapPlayer1, setSwapPlayer1] = useState<string | null>(null);
  const [swapPlayer2, setSwapPlayer2] = useState<string | null>(null);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(false);

  // Audit log
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);

  const dateString = format(selectedDate, 'yyyy-MM-dd');
  const isEligible = players.length >= MINIMUM_PLAYERS;
  const hasTeams = assignments.length > 0;
  const isLocked = teamStatus === 'locked';

  // Filter players
  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPosition =
        positionFilter === 'all' ||
        player.mainPosition === positionFilter ||
        player.altPosition === positionFilter;
      const matchesRating = ratingFilter === 'all' || player.rating === ratingFilter;
      return matchesSearch && matchesPosition && matchesRating;
    });
  }, [players, searchQuery, positionFilter, ratingFilter]);

  // Get teams grouped by color
  const teamsByColor = useMemo(() => {
    const grouped: Record<TeamColor, PlayerAssignment[]> = {
      RED: [],
      BLUE: [],
      YELLOW: [],
      SUB: [],
    };
    assignments.forEach((a) => {
      grouped[a.team].push(a);
    });
    return grouped;
  }, [assignments]);

  // Add to audit log
  const addAuditEntry = useCallback((action: string, details: string) => {
    setAuditLog((prev) => [
      {
        id: crypto.randomUUID(),
        action,
        details,
        timestamp: new Date(),
      },
      ...prev,
    ]);
  }, []);

  // Generate teams using the OR-Tools solver
  async function generateTeams() {
    setIsGenerating(true);
    setWarnings([]);

    try {
      const response = await fetch('/api/teams/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateString,
          options: { timeout_seconds: 5.0 },
        }),
      });

      const result = await response.json();

      if (result.success) {
        setAssignments(result.assignments || []);
        setTeamMetrics(result.team_metrics || []);
        setWarnings(result.warnings || []);
        setSolveTimeMs(result.solve_time_ms || null);
        addAuditEntry('generate', `Generated teams for ${players.length} players`);
      } else {
        setWarnings([result.message || 'Failed to generate teams']);
      }
    } catch (err) {
      console.error('Generation error:', err);
      setWarnings(['Failed to connect to solver. Make sure the Python solver is running.']);
    } finally {
      setIsGenerating(false);
    }
  }

  // Save teams (draft, publish, or lock)
  async function saveTeams(status: TeamRunStatus) {
    setIsSaving(true);

    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateString,
          assignments: assignments.map((a) => ({
            player_id: a.player_id,
            team_color: a.team,
            assigned_role: a.role,
            bench_team: a.bench_team,
            is_manual_override: a.is_manual_override,
          })),
          status,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTeamRunId(result.teamRunId);
        setTeamStatus(status);
        addAuditEntry(status, result.message);
        router.refresh();
      } else {
        setWarnings([result.error || 'Failed to save teams']);
      }
    } catch (err) {
      console.error('Save error:', err);
      setWarnings(['Failed to save teams']);
    } finally {
      setIsSaving(false);
    }
  }

  // Swap two players between teams
  function swapPlayers() {
    if (!swapPlayer1 || !swapPlayer2) return;

    setAssignments((prev) => {
      const player1 = prev.find((a) => a.player_id === swapPlayer1);
      const player2 = prev.find((a) => a.player_id === swapPlayer2);

      if (!player1 || !player2) return prev;

      return prev.map((a) => {
        if (a.player_id === swapPlayer1) {
          return { ...a, team: player2.team, is_manual_override: true };
        }
        if (a.player_id === swapPlayer2) {
          return { ...a, team: player1.team, is_manual_override: true };
        }
        return a;
      });
    });

    const p1 = assignments.find((a) => a.player_id === swapPlayer1);
    const p2 = assignments.find((a) => a.player_id === swapPlayer2);
    addAuditEntry(
      'swap',
      `Swapped ${p1?.player_name} (${p1?.team}) with ${p2?.player_name} (${p2?.team})`
    );

    setShowSwapDialog(false);
    setSwapPlayer1(null);
    setSwapPlayer2(null);
  }

  // Move player to different team
  function movePlayer(playerId: string, newTeam: TeamColor) {
    setAssignments((prev) => {
      const player = prev.find((a) => a.player_id === playerId);
      if (!player) return prev;

      addAuditEntry(
        'move',
        `Moved ${player.player_name} from ${player.team} to ${newTeam}`
      );

      return prev.map((a) =>
        a.player_id === playerId ? { ...a, team: newTeam, is_manual_override: true } : a
      );
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Generator</h1>
          <p className="text-gray-500">Generate balanced teams for game day</p>
        </div>
        {teamStatus !== 'draft' && (
          <Badge
            variant={teamStatus === 'locked' ? 'destructive' : 'default'}
            className="text-sm"
          >
            {teamStatus === 'published' ? 'Published' : 'Locked'}
          </Badge>
        )}
      </div>

      {/* Date & Status Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <span className="font-medium">Date:</span>
              <Badge variant="outline" className="text-base">
                {format(selectedDate, 'EEE, MMM d, yyyy')}
              </Badge>
            </div>

            <div className="h-6 w-px bg-gray-300" />

            <div className="flex items-center gap-2">
              <span className="text-gray-500">Checked In:</span>
              <Badge variant={isEligible ? 'default' : 'secondary'}>
                {players.length}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-500">Status:</span>
              <Badge variant={isEligible ? 'default' : 'destructive'}>
                {isEligible ? `Eligible (≥${MINIMUM_PLAYERS})` : `Need ${MINIMUM_PLAYERS - players.length} more`}
              </Badge>
            </div>

            {solveTimeMs && (
              <div className="text-sm text-gray-500">
                Solved in {solveTimeMs.toFixed(0)}ms
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Checked-in Players Table */}
      <Card>
        <CardHeader>
          <CardTitle>Checked-in Players ({players.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <Input
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
            <Select
              value={positionFilter}
              onValueChange={(v) => setPositionFilter(v as PositionType | 'all')}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                <SelectItem value="GK">Goalkeeper</SelectItem>
                <SelectItem value="DF">Defender</SelectItem>
                <SelectItem value="MID">Midfielder</SelectItem>
                <SelectItem value="ST">Striker</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={ratingFilter === 'all' ? 'all' : String(ratingFilter)}
              onValueChange={(v) => setRatingFilter(v === 'all' ? 'all' : Number(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                {[5, 4, 3, 2, 1].map((r) => (
                  <SelectItem key={r} value={String(r)}>{r} Stars</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg max-h-64 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell className="font-medium">{player.name}</TableCell>
                    <TableCell>{player.age}</TableCell>
                    <TableCell>
                      {player.mainPosition}
                      {player.altPosition && ` / ${player.altPosition}`}
                    </TableCell>
                    <TableCell>
                      <StarRating rating={player.rating} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Generation Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Team Generation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <Button
              onClick={generateTeams}
              disabled={!isEligible || isGenerating || isLocked}
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', isGenerating && 'animate-spin')} />
              {isGenerating ? 'Generating...' : hasTeams ? 'Regenerate' : 'Generate Teams'}
            </Button>

            {hasTeams && !isLocked && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowSwapDialog(true)}
                >
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  Swap Players
                </Button>

                <div className="flex-1" />

                <Button
                  variant="outline"
                  onClick={() => saveTeams('draft')}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>

                <Button
                  onClick={() => setShowPublishConfirm(true)}
                  disabled={isSaving}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Publish
                </Button>

                {teamStatus === 'published' && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowLockConfirm(true)}
                    disabled={isSaving}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Lock
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                {warnings.map((warning, i) => (
                  <p key={i} className="text-yellow-800">{warning}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Teams */}
      {hasTeams && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(['RED', 'BLUE', 'YELLOW', 'SUB'] as TeamColor[]).map((color) => {
                const teamPlayers = teamsByColor[color];
                if (teamPlayers.length === 0 && color !== 'SUB') return null;

                const metrics = teamMetrics.find((m) => m.team === color);
                const colorConfig = TEAM_COLORS[color];

                return (
                  <div
                    key={color}
                    className={cn(
                      'border-2 rounded-lg p-4',
                      colorConfig.border,
                      colorConfig.bg
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={cn('font-bold', colorConfig.text)}>
                        {color === 'SUB' ? 'SUBSTITUTES' : `Team ${color}`}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {teamPlayers.length}
                      </Badge>
                    </div>

                    {metrics && color !== 'SUB' && (
                      <div className="text-xs text-gray-600 mb-2">
                        Skill: {metrics.skill_sum} ({metrics.skill_avg.toFixed(1)} avg) •
                        Age: {metrics.age_sum} ({metrics.age_avg.toFixed(1)} avg)
                        {!metrics.has_goalkeeper && (
                          <span className="text-red-600 font-medium"> • No GK!</span>
                        )}
                      </div>
                    )}

                    <ul className="space-y-1">
                      {teamPlayers.map((player) => (
                        <li
                          key={player.player_id}
                          className={cn(
                            'flex items-center justify-between text-sm p-1.5 rounded',
                            player.is_manual_override && 'bg-white/50 border border-dashed'
                          )}
                        >
                          <div>
                            <span className="font-medium">{player.player_name}</span>
                            {player.is_manual_override && (
                              <span className="text-xs text-gray-500 ml-1">(moved)</span>
                            )}
                            {player.bench_team && (
                              <span className="text-xs text-gray-500 ml-1">
                                → {player.bench_team}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-xs">
                              {player.role}
                            </span>
                            {!isLocked && (
                              <Select
                                value=""
                                onValueChange={(v) => movePlayer(player.player_id, v as TeamColor)}
                              >
                                <SelectTrigger className="h-6 w-6 p-0 border-0">
                                  <span className="text-gray-400">→</span>
                                </SelectTrigger>
                                <SelectContent>
                                  {(['RED', 'BLUE', 'YELLOW', 'SUB'] as TeamColor[])
                                    .filter((c) => c !== player.team)
                                    .map((c) => (
                                      <SelectItem key={c} value={c}>
                                        Move to {c}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>

                    {teamPlayers.length === 0 && (
                      <p className="text-sm text-gray-500 italic">No players</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Log */}
      {auditLog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Audit Log</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm max-h-48 overflow-auto">
              {auditLog.map((entry) => (
                <li key={entry.id} className="flex items-center gap-2 text-gray-600">
                  <span className="text-gray-400 text-xs">
                    {format(entry.timestamp, 'h:mm:ss a')}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {entry.action}
                  </Badge>
                  <span>{entry.details}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Swap Players Dialog */}
      <Dialog open={showSwapDialog} onOpenChange={setShowSwapDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Swap Players</DialogTitle>
            <DialogDescription>
              Select two players to swap their team assignments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={swapPlayer1 || ''} onValueChange={setSwapPlayer1}>
              <SelectTrigger>
                <SelectValue placeholder="Select first player" />
              </SelectTrigger>
              <SelectContent>
                {assignments.map((a) => (
                  <SelectItem key={a.player_id} value={a.player_id}>
                    {a.player_name} ({a.team})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={swapPlayer2 || ''} onValueChange={setSwapPlayer2}>
              <SelectTrigger>
                <SelectValue placeholder="Select second player" />
              </SelectTrigger>
              <SelectContent>
                {assignments
                  .filter((a) => a.player_id !== swapPlayer1)
                  .map((a) => (
                    <SelectItem key={a.player_id} value={a.player_id}>
                      {a.player_name} ({a.team})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSwapDialog(false)}>
              Cancel
            </Button>
            <Button onClick={swapPlayers} disabled={!swapPlayer1 || !swapPlayer2}>
              Swap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Confirmation */}
      <AlertDialog open={showPublishConfirm} onOpenChange={setShowPublishConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish Teams?</AlertDialogTitle>
            <AlertDialogDescription>
              Players will be able to see their team assignments. You can still make changes after publishing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => saveTeams('published')}>
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lock Confirmation */}
      <AlertDialog open={showLockConfirm} onOpenChange={setShowLockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lock Teams?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently lock the teams. No further changes can be made. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => saveTeams('locked')}
              className="bg-red-600 hover:bg-red-700"
            >
              Lock Teams
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
