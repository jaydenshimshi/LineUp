/**
 * Team Balancing Solver - Production Grade
 *
 * A sophisticated TypeScript implementation of balanced team generation.
 * Uses multi-objective optimization with simulated annealing for near-optimal results.
 *
 * Features:
 * - Skill balance optimization (minimize gap between teams)
 * - Age balance optimization
 * - Position coverage (ensures GK, balanced formations)
 * - Simulated annealing for global optimization
 * - Fair sub allocation with bench team assignment
 *
 * This runs directly in Next.js - deploys anywhere.
 */

// Types
export type Position = 'GK' | 'DF' | 'MID' | 'ST';
export type TeamColor = 'RED' | 'BLUE' | 'YELLOW' | 'SUB';

export interface Player {
  id: string;
  name: string;
  age: number;
  rating: number; // 1-5 stars
  mainPosition: Position;
  altPosition?: Position | null;
}

export interface PlayerAssignment {
  playerId: string;
  playerName: string;
  team: TeamColor;
  role: Position;
  benchTeam?: TeamColor | null;
}

export interface TeamMetrics {
  team: TeamColor;
  playerCount: number;
  skillSum: number;
  skillAvg: number;
  ageSum: number;
  ageAvg: number;
  hasGoalkeeper: boolean;
  positions: Record<Position, number>;
}

export interface SolveResult {
  success: boolean;
  message: string;
  assignments: PlayerAssignment[];
  teamMetrics: TeamMetrics[];
  warnings: string[];
  solveTimeMs: number;
}

// Configuration - matches OR-Tools solver weights
const CONFIG = {
  MIN_PLAYERS_TO_PLAY: 6,
  MIN_TEAM_SIZE: 3,
  MAX_TEAM_SIZE: 7,

  // Optimization weights (higher = more important)
  W_SKILL_BALANCE: 1000,
  W_AGE_BALANCE: 200,
  W_POSITION_MISMATCH: 80,
  W_GK_MISSING: 500,
  W_FORMATION_SLACK: 50,

  // Simulated annealing parameters
  SA_INITIAL_TEMP: 100,
  SA_COOLING_RATE: 0.995,
  SA_MIN_TEMP: 0.1,
  SA_ITERATIONS_PER_TEMP: 50,

  // Formation targets by team size
  FORMATIONS: {
    3: { GK: 0, DF: 1, MID: 1, ST: 1 },
    4: { GK: 1, DF: 1, MID: 1, ST: 1 },
    5: { GK: 1, DF: 2, MID: 1, ST: 1 },
    6: { GK: 1, DF: 2, MID: 2, ST: 1 },
    7: { GK: 1, DF: 2, MID: 2, ST: 2 },
  } as Record<number, Record<Position, number>>,
};

/**
 * Determine number of teams based on player count
 * Yellow team only exists if >= 21 players
 */
function getTeamCount(playerCount: number): number {
  return playerCount >= 21 ? 3 : 2;
}

/**
 * Calculate team sizes based on 7-a-side preference
 */
function getTeamSizes(playerCount: number, teamCount: number): number[] {
  if (playerCount >= 21 && teamCount === 3) {
    return [7, 7, 7];
  } else if (playerCount >= 14) {
    return [7, 7];
  } else {
    const perTeam = Math.min(7, Math.max(3, Math.floor(playerCount / 2)));
    const remainder = playerCount - perTeam;
    return [perTeam, Math.min(7, Math.max(3, remainder))];
  }
}

/**
 * Check if player can play a position
 */
function canPlayPosition(player: Player, position: Position): boolean {
  return player.mainPosition === position || player.altPosition === position;
}

/**
 * Get formation target for team size
 */
function getFormationTarget(teamSize: number): Record<Position, number> {
  const sizes = Object.keys(CONFIG.FORMATIONS).map(Number).sort((a, b) => b - a);
  for (const size of sizes) {
    if (teamSize >= size) {
      return CONFIG.FORMATIONS[size];
    }
  }
  return CONFIG.FORMATIONS[3];
}

/**
 * Solution state for optimization
 */
interface SolutionState {
  teams: Map<TeamColor, Player[]>;
  subs: Player[];
  teamColors: TeamColor[];
  targetSizes: number[];
}

/**
 * Calculate objective score (lower is better)
 */
function calculateObjective(state: SolutionState, allPlayers: Player[]): number {
  let score = 0;
  const { teams, teamColors } = state;

  // Get team stats
  const teamStats = teamColors.map(color => {
    const team = teams.get(color) || [];
    return {
      color,
      players: team,
      skillSum: team.reduce((s, p) => s + p.rating, 0),
      ageSum: team.reduce((s, p) => s + p.age, 0),
      size: team.length,
    };
  });

  // 1. Skill balance - minimize max-min gap
  const skills = teamStats.map(t => t.skillSum);
  const skillGap = Math.max(...skills) - Math.min(...skills);
  score += CONFIG.W_SKILL_BALANCE * skillGap;

  // 2. Age balance - minimize max-min gap
  const ages = teamStats.map(t => t.ageSum);
  const ageGap = Math.max(...ages) - Math.min(...ages);
  score += CONFIG.W_AGE_BALANCE * ageGap;

  // 3. GK coverage penalty
  for (const stat of teamStats) {
    const hasGK = stat.players.some(p => canPlayPosition(p, 'GK'));
    if (!hasGK && stat.size > 0) {
      score += CONFIG.W_GK_MISSING;
    }
  }

  // 4. Formation slack penalty
  for (const stat of teamStats) {
    if (stat.size === 0) continue;
    const target = getFormationTarget(stat.size);
    const actual: Record<Position, number> = { GK: 0, DF: 0, MID: 0, ST: 0 };

    for (const player of stat.players) {
      actual[player.mainPosition]++;
    }

    for (const pos of ['GK', 'DF', 'MID', 'ST'] as Position[]) {
      score += CONFIG.W_FORMATION_SLACK * Math.abs(actual[pos] - target[pos]);
    }
  }

  return score;
}

/**
 * Generate a neighbor solution by swapping two players
 */
function generateNeighbor(state: SolutionState): SolutionState {
  const newState: SolutionState = {
    teams: new Map(),
    subs: [...state.subs],
    teamColors: state.teamColors,
    targetSizes: state.targetSizes,
  };

  // Deep copy teams
  for (const color of state.teamColors) {
    newState.teams.set(color, [...(state.teams.get(color) || [])]);
  }

  const random = Math.random();

  if (random < 0.7 && state.teamColors.length >= 2) {
    // 70% chance: Swap between two teams
    const colorIndices = [...Array(state.teamColors.length).keys()];
    const idx1 = colorIndices[Math.floor(Math.random() * colorIndices.length)];
    let idx2 = idx1;
    while (idx2 === idx1 && colorIndices.length > 1) {
      idx2 = colorIndices[Math.floor(Math.random() * colorIndices.length)];
    }

    const team1 = newState.teams.get(state.teamColors[idx1])!;
    const team2 = newState.teams.get(state.teamColors[idx2])!;

    if (team1.length > 0 && team2.length > 0) {
      const i1 = Math.floor(Math.random() * team1.length);
      const i2 = Math.floor(Math.random() * team2.length);
      [team1[i1], team2[i2]] = [team2[i2], team1[i1]];
    }
  } else if (random < 0.9 && newState.subs.length > 0) {
    // 20% chance: Swap with subs
    const colorIdx = Math.floor(Math.random() * state.teamColors.length);
    const team = newState.teams.get(state.teamColors[colorIdx])!;
    const targetSize = state.targetSizes[colorIdx];

    if (team.length > 0 && team.length >= targetSize && newState.subs.length > 0) {
      const teamIdx = Math.floor(Math.random() * team.length);
      const subIdx = Math.floor(Math.random() * newState.subs.length);
      [team[teamIdx], newState.subs[subIdx]] = [newState.subs[subIdx], team[teamIdx]];
    }
  } else {
    // 10% chance: Shuffle within team
    const colorIdx = Math.floor(Math.random() * state.teamColors.length);
    const team = newState.teams.get(state.teamColors[colorIdx])!;
    if (team.length >= 2) {
      const i = Math.floor(Math.random() * team.length);
      let j = i;
      while (j === i) {
        j = Math.floor(Math.random() * team.length);
      }
      [team[i], team[j]] = [team[j], team[i]];
    }
  }

  return newState;
}

/**
 * Simulated annealing optimization
 */
function optimizeWithSA(
  initialState: SolutionState,
  allPlayers: Player[]
): SolutionState {
  let currentState = initialState;
  let currentScore = calculateObjective(currentState, allPlayers);
  let bestState = currentState;
  let bestScore = currentScore;

  let temperature = CONFIG.SA_INITIAL_TEMP;

  while (temperature > CONFIG.SA_MIN_TEMP) {
    for (let i = 0; i < CONFIG.SA_ITERATIONS_PER_TEMP; i++) {
      const neighborState = generateNeighbor(currentState);
      const neighborScore = calculateObjective(neighborState, allPlayers);

      const delta = neighborScore - currentScore;

      // Accept if better, or probabilistically if worse
      if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
        currentState = neighborState;
        currentScore = neighborScore;

        if (currentScore < bestScore) {
          bestState = currentState;
          bestScore = currentScore;
        }
      }
    }

    temperature *= CONFIG.SA_COOLING_RATE;
  }

  return bestState;
}

/**
 * Create initial solution using greedy assignment
 */
function createInitialSolution(
  players: Player[],
  teamColors: TeamColor[],
  targetSizes: number[]
): SolutionState {
  const teams: Map<TeamColor, Player[]> = new Map();
  teamColors.forEach(color => teams.set(color, []));

  const assigned = new Set<string>();

  // Sort players: GKs first (rare resource), then by rating
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.mainPosition === 'GK' && b.mainPosition !== 'GK') return -1;
    if (b.mainPosition === 'GK' && a.mainPosition !== 'GK') return 1;
    if (a.altPosition === 'GK' && b.altPosition !== 'GK') return -1;
    if (b.altPosition === 'GK' && a.altPosition !== 'GK') return 1;
    return b.rating - a.rating;
  });

  // First pass: Assign one GK per team
  const gkPlayers = sortedPlayers.filter(p =>
    p.mainPosition === 'GK' || p.altPosition === 'GK'
  );

  for (let i = 0; i < teamColors.length && i < gkPlayers.length; i++) {
    teams.get(teamColors[i])!.push(gkPlayers[i]);
    assigned.add(gkPlayers[i].id);
  }

  // Second pass: Snake draft for remaining players
  const remaining = sortedPlayers.filter(p => !assigned.has(p.id));
  let playerIdx = 0;
  let round = 0;

  while (playerIdx < remaining.length) {
    const order = round % 2 === 0 ? [...teamColors] : [...teamColors].reverse();

    for (const color of order) {
      if (playerIdx >= remaining.length) break;

      const team = teams.get(color)!;
      if (team.length < targetSizes[teamColors.indexOf(color)]) {
        team.push(remaining[playerIdx]);
        assigned.add(remaining[playerIdx].id);
        playerIdx++;
      }
    }
    round++;

    // Safety check
    if (round > players.length * 2) break;
  }

  // Remaining become subs
  const subs = remaining.filter(p => !assigned.has(p.id));

  return { teams, subs, teamColors, targetSizes };
}

/**
 * Assign positions to players on each team
 */
function assignPositions(
  state: SolutionState
): Map<string, Position> {
  const assignments = new Map<string, Position>();

  for (const color of state.teamColors) {
    const team = state.teams.get(color) || [];
    const target = getFormationTarget(team.length);
    const filled: Record<Position, number> = { GK: 0, DF: 0, MID: 0, ST: 0 };

    // Sort by position scarcity (GK first)
    const sorted = [...team].sort((a, b) => {
      if (a.mainPosition === 'GK') return -1;
      if (b.mainPosition === 'GK') return 1;
      return 0;
    });

    for (const player of sorted) {
      let assigned: Position = player.mainPosition;

      // Try main position first
      if (filled[player.mainPosition] < target[player.mainPosition]) {
        assigned = player.mainPosition;
      }
      // Try alt position
      else if (player.altPosition && filled[player.altPosition] < target[player.altPosition]) {
        assigned = player.altPosition;
      }
      // Find any unfilled position
      else {
        for (const pos of ['DF', 'MID', 'ST', 'GK'] as Position[]) {
          if (filled[pos] < target[pos]) {
            assigned = pos;
            break;
          }
        }
      }

      filled[assigned]++;
      assignments.set(player.id, assigned);
    }
  }

  // Subs get their main position
  for (const player of state.subs) {
    assignments.set(player.id, player.mainPosition);
  }

  return assignments;
}

/**
 * Main solver function
 */
export function solveTeams(players: Player[]): SolveResult {
  const startTime = performance.now();
  const warnings: string[] = [];

  // Validate minimum players
  if (players.length < CONFIG.MIN_PLAYERS_TO_PLAY) {
    return {
      success: false,
      message: `Not enough players (${players.length}). Need at least ${CONFIG.MIN_PLAYERS_TO_PLAY}.`,
      assignments: [],
      teamMetrics: [],
      warnings: [],
      solveTimeMs: performance.now() - startTime,
    };
  }

  const teamCount = getTeamCount(players.length);
  const teamColors: TeamColor[] = teamCount === 3
    ? ['RED', 'BLUE', 'YELLOW']
    : ['RED', 'BLUE'];
  const targetSizes = getTeamSizes(players.length, teamCount);

  // Check GK availability
  const gkCount = players.filter(p =>
    p.mainPosition === 'GK' || p.altPosition === 'GK'
  ).length;

  if (gkCount < teamCount) {
    warnings.push(`Only ${gkCount} goalkeeper(s) for ${teamCount} teams.`);
  }

  // Create initial solution
  const initialState = createInitialSolution(players, teamColors, targetSizes);

  // Optimize with simulated annealing
  const optimizedState = optimizeWithSA(initialState, players);

  // Assign positions
  const positionAssignments = assignPositions(optimizedState);

  // Build final assignments
  const assignments: PlayerAssignment[] = [];

  for (const color of teamColors) {
    const team = optimizedState.teams.get(color) || [];
    for (const player of team) {
      assignments.push({
        playerId: player.id,
        playerName: player.name,
        team: color,
        role: positionAssignments.get(player.id) || player.mainPosition,
      });
    }
  }

  // Assign subs with bench teams (fair distribution)
  for (let i = 0; i < optimizedState.subs.length; i++) {
    const player = optimizedState.subs[i];
    assignments.push({
      playerId: player.id,
      playerName: player.name,
      team: 'SUB',
      role: positionAssignments.get(player.id) || player.mainPosition,
      benchTeam: teamColors[i % teamColors.length],
    });
  }

  // Calculate team metrics
  const teamMetrics: TeamMetrics[] = [];

  for (const color of [...teamColors, 'SUB' as TeamColor]) {
    const teamAssignments = assignments.filter(a => a.team === color);
    if (teamAssignments.length === 0) continue;

    const teamPlayers = teamAssignments.map(a =>
      players.find(p => p.id === a.playerId)!
    );

    const skillSum = teamPlayers.reduce((s, p) => s + p.rating, 0);
    const ageSum = teamPlayers.reduce((s, p) => s + p.age, 0);
    const positions: Record<Position, number> = { GK: 0, DF: 0, MID: 0, ST: 0 };

    teamAssignments.forEach(a => positions[a.role]++);

    const hasGK = positions.GK > 0;
    if (!hasGK && color !== 'SUB') {
      warnings.push(`Team ${color} is missing a goalkeeper.`);
    }

    teamMetrics.push({
      team: color,
      playerCount: teamPlayers.length,
      skillSum,
      skillAvg: Math.round((skillSum / teamPlayers.length) * 100) / 100,
      ageSum,
      ageAvg: Math.round((ageSum / teamPlayers.length) * 100) / 100,
      hasGoalkeeper: hasGK,
      positions,
    });
  }

  const solveTimeMs = performance.now() - startTime;

  return {
    success: true,
    message: `Teams generated successfully (${Math.round(solveTimeMs)}ms)`,
    assignments,
    teamMetrics,
    warnings,
    solveTimeMs,
  };
}

/**
 * Convert from API input format
 */
export function parsePlayersFromAPI(playersData: Array<{
  player_id: string;
  name: string;
  age: number;
  rating: number;
  main_position: string;
  alt_position?: string | null;
}>): Player[] {
  return playersData.map(p => ({
    id: p.player_id,
    name: p.name,
    age: p.age,
    rating: Math.max(1, Math.min(5, p.rating)),
    mainPosition: p.main_position as Position,
    altPosition: p.alt_position as Position | null,
  }));
}

/**
 * Convert to API response format
 */
export function formatResultForAPI(result: SolveResult): {
  success: boolean;
  message: string;
  assignments: Array<{
    player_id: string;
    player_name: string;
    team: string;
    role: string;
    bench_team: string | null;
  }>;
  team_metrics: Array<{
    team: string;
    player_count: number;
    skill_sum: number;
    skill_avg: number;
    age_sum: number;
    age_avg: number;
    has_goalkeeper: boolean;
    positions: Record<string, number>;
  }>;
  warnings: string[];
  solve_time_ms: number;
} {
  return {
    success: result.success,
    message: result.message,
    assignments: result.assignments.map(a => ({
      player_id: a.playerId,
      player_name: a.playerName,
      team: a.team,
      role: a.role,
      bench_team: a.benchTeam || null,
    })),
    team_metrics: result.teamMetrics.map(m => ({
      team: m.team,
      player_count: m.playerCount,
      skill_sum: m.skillSum,
      skill_avg: m.skillAvg,
      age_sum: m.ageSum,
      age_avg: m.ageAvg,
      has_goalkeeper: m.hasGoalkeeper,
      positions: m.positions,
    })),
    warnings: result.warnings,
    solve_time_ms: result.solveTimeMs,
  };
}
