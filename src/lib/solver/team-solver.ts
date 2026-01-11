/**
 * Team Balancing Solver - Production Grade
 *
 * Robust team generation algorithm that:
 * - Creates balanced teams by skill rating
 * - Distributes positions properly (GK, DF, MID, ST)
 * - Handles uneven teams (4v3, 5v4, 6v5, 7v6)
 * - Only creates subs when >14 players
 * - Uses simulated annealing for optimization
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
  benchTeam?: TeamColor | null; // For subs: which team they belong to
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

// Configuration
const CONFIG = {
  MIN_PLAYERS: 6,
  MAX_TEAM_SIZE: 7,
  THREE_TEAM_THRESHOLD: 21, // 3 teams only when 21+ players

  // Optimization weights (higher = more important)
  W_SKILL_BALANCE: 1000,    // Most important: balanced skill
  W_AGE_BALANCE: 100,       // Secondary: balanced age
  W_POSITION_COVERAGE: 500, // Important: proper position distribution
  W_GK_COVERAGE: 800,       // Very important: each team has a GK

  // Simulated annealing parameters
  SA_INITIAL_TEMP: 100,
  SA_COOLING_RATE: 0.995,
  SA_MIN_TEMP: 0.1,
  SA_ITERATIONS_PER_TEMP: 100,

  // Target formations by team size
  // Format: [GK, DF, MID, ST]
  FORMATIONS: {
    3: { GK: 0, DF: 1, MID: 1, ST: 1 },
    4: { GK: 1, DF: 1, MID: 1, ST: 1 },
    5: { GK: 1, DF: 2, MID: 1, ST: 1 },
    6: { GK: 1, DF: 2, MID: 2, ST: 1 },
    7: { GK: 1, DF: 3, MID: 2, ST: 1 }, // 1-3-2-1 formation
  } as Record<number, Record<Position, number>>,
};

/**
 * Calculate team structure based on player count
 *
 * Rules:
 * - 6-14 players: 2 teams, ALL players play (uneven OK: 4v3, 5v4, etc.)
 * - 15-20 players: 2 teams of 7 + subs (subs assigned to RED or BLUE)
 * - 21+ players: 3 teams of 7 (+ subs if >21)
 */
function calculateTeamStructure(playerCount: number): {
  teamCount: number;
  teamSizes: number[];
  subCount: number;
  teamColors: TeamColor[];
} {
  // 21+ players: 3 teams
  if (playerCount >= CONFIG.THREE_TEAM_THRESHOLD) {
    const playingPlayers = 21; // 7v7v7
    const subCount = playerCount - playingPlayers;
    return {
      teamCount: 3,
      teamSizes: [7, 7, 7],
      subCount,
      teamColors: ['RED', 'BLUE', 'YELLOW'],
    };
  }

  // 15-20 players: 2 teams of 7 + subs
  if (playerCount > 14) {
    const subCount = playerCount - 14;
    return {
      teamCount: 2,
      teamSizes: [7, 7],
      subCount,
      teamColors: ['RED', 'BLUE'],
    };
  }

  // 6-14 players: 2 teams, all play, uneven is OK
  const biggerTeam = Math.ceil(playerCount / 2);
  const smallerTeam = Math.floor(playerCount / 2);
  return {
    teamCount: 2,
    teamSizes: [biggerTeam, smallerTeam],
    subCount: 0,
    teamColors: ['RED', 'BLUE'],
  };
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
  const clamped = Math.max(3, Math.min(7, teamSize));
  return CONFIG.FORMATIONS[clamped] || CONFIG.FORMATIONS[7];
}

/**
 * Solution state for optimization
 */
interface SolutionState {
  teams: Map<TeamColor, Player[]>;
  subs: Array<{ player: Player; benchTeam: TeamColor }>;
  teamColors: TeamColor[];
  targetSizes: number[];
}

/**
 * Calculate player's effective strength considering versatility
 * Players who can play multiple positions are more valuable
 */
function getPlayerEffectiveStrength(player: Player): number {
  let strength = player.rating;

  // Bonus for having an alternate position (versatility)
  if (player.altPosition) {
    strength += 0.3; // Versatile players are slightly more valuable
  }

  // Extra bonus for GK capability (rare and valuable)
  if (player.mainPosition === 'GK' || player.altPosition === 'GK') {
    strength += 0.2;
  }

  return strength;
}

/**
 * Calculate team's position coverage considering alt positions
 * Returns how well a team can cover all positions
 */
function getPositionCoverage(players: Player[]): Record<Position, number> {
  const coverage: Record<Position, number> = { GK: 0, DF: 0, MID: 0, ST: 0 };

  for (const player of players) {
    // Main position counts as 1.0
    coverage[player.mainPosition] += 1.0;
    // Alt position counts as 0.5 (can cover if needed)
    if (player.altPosition) {
      coverage[player.altPosition] += 0.5;
    }
  }

  return coverage;
}

/**
 * Calculate objective score (lower is better)
 */
function calculateObjective(state: SolutionState): number {
  let score = 0;
  const { teams, teamColors } = state;

  // Get team stats including effective strength (considers versatility)
  const teamStats = teamColors.map(color => {
    const team = teams.get(color) || [];
    return {
      color,
      players: team,
      skillSum: team.reduce((s, p) => s + p.rating, 0),
      effectiveStrength: team.reduce((s, p) => s + getPlayerEffectiveStrength(p), 0),
      ageSum: team.reduce((s, p) => s + p.age, 0),
      size: team.length,
      positionCoverage: getPositionCoverage(team),
    };
  });

  // Filter out empty teams for calculations
  const activeTeams = teamStats.filter(t => t.size > 0);
  if (activeTeams.length < 2) return score;

  // 1. Effective strength balance (considers skill + versatility)
  // For uneven teams, normalize by team size
  const strengthNormalized = activeTeams.map(t => t.effectiveStrength / Math.max(1, t.size));
  const strengthGap = Math.max(...strengthNormalized) - Math.min(...strengthNormalized);
  score += CONFIG.W_SKILL_BALANCE * strengthGap;

  // Also penalize absolute skill difference (raw ratings should be close)
  const skills = activeTeams.map(t => t.skillSum);
  const avgSkill = skills.reduce((a, b) => a + b, 0) / skills.length;
  for (const skill of skills) {
    score += CONFIG.W_SKILL_BALANCE * 0.15 * Math.abs(skill - avgSkill);
  }

  // 2. Age balance - minimize max-min gap (normalized)
  const agesNormalized = activeTeams.map(t => t.ageSum / Math.max(1, t.size));
  const ageGap = Math.max(...agesNormalized) - Math.min(...agesNormalized);
  score += CONFIG.W_AGE_BALANCE * ageGap;

  // 3. GK coverage - each team should have a GK (if possible)
  for (const stat of activeTeams) {
    if (stat.size >= 4) { // Only require GK for teams of 4+
      const hasGK = stat.players.some(p => canPlayPosition(p, 'GK'));
      if (!hasGK) {
        score += CONFIG.W_GK_COVERAGE;
      }
    }
  }

  // 4. Position distribution - use coverage that considers alt positions
  for (const stat of activeTeams) {
    const target = getFormationTarget(stat.size);
    const coverage = stat.positionCoverage;

    // Penalize deviation from ideal formation (using coverage which includes alt positions)
    for (const pos of ['GK', 'DF', 'MID', 'ST'] as Position[]) {
      // If coverage is less than target, that's a problem
      const shortfall = Math.max(0, target[pos] - coverage[pos]);
      score += CONFIG.W_POSITION_COVERAGE * shortfall;
    }

    // Heavy penalty if a single position dominates (even with alts)
    const mainPositions: Record<Position, number> = { GK: 0, DF: 0, MID: 0, ST: 0 };
    for (const player of stat.players) {
      mainPositions[player.mainPosition]++;
    }

    for (const pos of ['DF', 'MID', 'ST'] as Position[]) {
      if (mainPositions[pos] > stat.size * 0.6) {
        score += CONFIG.W_POSITION_COVERAGE * 2;
      }
    }
  }

  // 5. Versatility balance - teams should have similar flexibility
  const versatilityScores = activeTeams.map(t =>
    t.players.filter(p => p.altPosition).length / Math.max(1, t.size)
  );
  const versatilityGap = Math.max(...versatilityScores) - Math.min(...versatilityScores);
  score += CONFIG.W_POSITION_COVERAGE * 0.3 * versatilityGap;

  return score;
}

/**
 * Generate a neighbor solution by swapping players
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
  const activeTeamColors = state.teamColors.filter(
    c => (state.teams.get(c)?.length || 0) > 0
  );

  // Only allow swapping with subs if there ARE subs (>14 players)
  // For 6-14 players, subs.length should be 0, so we only swap between teams
  const allowSubSwaps = state.subs.length > 0;

  if (random < 0.8 && activeTeamColors.length >= 2) {
    // 80% chance: Swap between two teams
    const idx1 = Math.floor(Math.random() * activeTeamColors.length);
    let idx2 = idx1;
    while (idx2 === idx1) {
      idx2 = Math.floor(Math.random() * activeTeamColors.length);
    }

    const team1 = newState.teams.get(activeTeamColors[idx1])!;
    const team2 = newState.teams.get(activeTeamColors[idx2])!;

    if (team1.length > 0 && team2.length > 0) {
      const i1 = Math.floor(Math.random() * team1.length);
      const i2 = Math.floor(Math.random() * team2.length);
      [team1[i1], team2[i2]] = [team2[i2], team1[i1]];
    }
  } else if (random < 0.95 && allowSubSwaps && newState.subs.length > 0) {
    // 15% chance: Swap player with sub (ONLY if subs are allowed)
    const colorIdx = Math.floor(Math.random() * activeTeamColors.length);
    const team = newState.teams.get(activeTeamColors[colorIdx])!;

    if (team.length > 0) {
      const teamIdx = Math.floor(Math.random() * team.length);
      const subIdx = Math.floor(Math.random() * newState.subs.length);

      const oldPlayer = team[teamIdx];
      const subEntry = newState.subs[subIdx];

      team[teamIdx] = subEntry.player;
      newState.subs[subIdx] = { player: oldPlayer, benchTeam: subEntry.benchTeam };
    }
  } else {
    // 5% chance: Move player between teams (for uneven team sizes)
    if (activeTeamColors.length >= 2) {
      // Find teams with different sizes
      const teamSizes = activeTeamColors.map(c => ({
        color: c,
        size: newState.teams.get(c)?.length || 0,
      }));

      const bigger = teamSizes.reduce((a, b) => a.size > b.size ? a : b);
      const smaller = teamSizes.reduce((a, b) => a.size < b.size ? a : b);

      if (bigger.size > smaller.size + 1) {
        // Move one player from bigger to smaller
        const bigTeam = newState.teams.get(bigger.color)!;
        const smallTeam = newState.teams.get(smaller.color)!;

        if (bigTeam.length > 0) {
          const idx = Math.floor(Math.random() * bigTeam.length);
          const player = bigTeam.splice(idx, 1)[0];
          smallTeam.push(player);
        }
      }
    }
  }

  return newState;
}

/**
 * Simulated annealing optimization
 */
function optimizeWithSA(initialState: SolutionState): SolutionState {
  let currentState = initialState;
  let currentScore = calculateObjective(currentState);
  let bestState = currentState;
  let bestScore = currentScore;

  let temperature = CONFIG.SA_INITIAL_TEMP;

  while (temperature > CONFIG.SA_MIN_TEMP) {
    for (let i = 0; i < CONFIG.SA_ITERATIONS_PER_TEMP; i++) {
      const neighborState = generateNeighbor(currentState);
      const neighborScore = calculateObjective(neighborState);

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
 * Create initial solution using smart assignment
 */
function createInitialSolution(
  players: Player[],
  structure: ReturnType<typeof calculateTeamStructure>
): SolutionState {
  const { teamColors, teamSizes, subCount } = structure;
  const teams: Map<TeamColor, Player[]> = new Map();
  teamColors.forEach(color => teams.set(color, []));

  const assigned = new Set<string>();

  // Sort players by rating (highest first) to enable balanced distribution
  const sortedPlayers = [...players].sort((a, b) => b.rating - a.rating);

  // Separate GKs for special handling
  const gkPlayers = sortedPlayers.filter(p => p.mainPosition === 'GK' || p.altPosition === 'GK');
  const nonGkPlayers = sortedPlayers.filter(p => p.mainPosition !== 'GK' && p.altPosition !== 'GK');

  // First: Assign one GK per team (if available)
  for (let i = 0; i < teamColors.length && i < gkPlayers.length; i++) {
    const gk = gkPlayers[i];
    teams.get(teamColors[i])!.push(gk);
    assigned.add(gk.id);
  }

  // Remaining GKs go into the general pool
  const remainingGks = gkPlayers.filter(p => !assigned.has(p.id));
  const remainingPlayers = [...remainingGks, ...nonGkPlayers];

  // Snake draft: distribute remaining players fairly
  // High rated players distributed alternating to balance skill
  let playerIdx = 0;
  let round = 0;

  const totalPlayingSpots = teamSizes.reduce((a, b) => a + b, 0);
  const playersToAssign = Math.min(remainingPlayers.length, totalPlayingSpots - assigned.size);

  while (playerIdx < playersToAssign) {
    // Alternate direction each round for fairness
    const order = round % 2 === 0 ? [...teamColors] : [...teamColors].reverse();

    for (const color of order) {
      if (playerIdx >= playersToAssign) break;

      const team = teams.get(color)!;
      const targetSize = teamSizes[teamColors.indexOf(color)];

      if (team.length < targetSize) {
        const player = remainingPlayers[playerIdx];
        team.push(player);
        assigned.add(player.id);
        playerIdx++;
      }
    }
    round++;

    // Safety check
    if (round > players.length * 2) break;
  }

  // Check for unassigned players
  const unassignedPlayers = players.filter(p => !assigned.has(p.id));

  // IMPORTANT: For 6-14 players, ALL should be on teams (no subs)
  // If there are unassigned players and subCount is 0, force them onto teams
  if (unassignedPlayers.length > 0 && subCount === 0) {
    console.log('[SOLVER] WARNING: Found unassigned players when subCount=0, forcing onto teams');
    // Distribute remaining players to teams (alternate to maintain balance)
    let teamIndex = 0;
    for (const player of unassignedPlayers) {
      const color = teamColors[teamIndex % teamColors.length];
      teams.get(color)!.push(player);
      assigned.add(player.id);
      teamIndex++;
    }
  }

  // Remaining players become subs (only when subCount > 0)
  const subs: Array<{ player: Player; benchTeam: TeamColor }> = [];
  const stillUnassigned = players.filter(p => !assigned.has(p.id));

  // Sort subs by rating to distribute fairly
  stillUnassigned.sort((a, b) => b.rating - a.rating);

  for (let i = 0; i < stillUnassigned.length; i++) {
    // Alternate between RED and BLUE for sub assignment
    const benchTeam = i % 2 === 0 ? 'RED' : 'BLUE';
    subs.push({ player: stillUnassigned[i], benchTeam: benchTeam as TeamColor });
  }

  return { teams, subs, teamColors, targetSizes: teamSizes };
}

/**
 * Assign positions to players on each team
 */
function assignPositions(state: SolutionState): Map<string, Position> {
  const assignments = new Map<string, Position>();

  for (const color of state.teamColors) {
    const team = state.teams.get(color) || [];
    if (team.length === 0) continue;

    const target = getFormationTarget(team.length);
    const filled: Record<Position, number> = { GK: 0, DF: 0, MID: 0, ST: 0 };

    // Sort: GKs first, then by position scarcity
    const sorted = [...team].sort((a, b) => {
      if (a.mainPosition === 'GK' && b.mainPosition !== 'GK') return -1;
      if (b.mainPosition === 'GK' && a.mainPosition !== 'GK') return 1;
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
      // Find any unfilled position (prefer non-GK)
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
  for (const sub of state.subs) {
    assignments.set(sub.player.id, sub.player.mainPosition);
  }

  return assignments;
}

/**
 * Main solver function
 */
export function solveTeams(players: Player[]): SolveResult {
  const startTime = performance.now();
  const warnings: string[] = [];

  console.log('[SOLVER] Input players:', players.length);
  console.log('[SOLVER] Players:', players.map(p => ({ id: p.id, name: p.name, pos: p.mainPosition })));

  // Validate minimum players
  if (players.length < CONFIG.MIN_PLAYERS) {
    return {
      success: false,
      message: `Not enough players (${players.length}). Need at least ${CONFIG.MIN_PLAYERS}.`,
      assignments: [],
      teamMetrics: [],
      warnings: [],
      solveTimeMs: performance.now() - startTime,
    };
  }

  // Calculate team structure
  const structure = calculateTeamStructure(players.length);
  console.log('[SOLVER] Structure:', structure);
  const { teamColors, subCount } = structure;

  // Check GK availability
  const gkCount = players.filter(p =>
    p.mainPosition === 'GK' || p.altPosition === 'GK'
  ).length;

  if (gkCount < structure.teamCount) {
    warnings.push(`Only ${gkCount} goalkeeper(s) for ${structure.teamCount} teams. Some teams may lack a GK.`);
  }

  // Create initial solution
  const initialState = createInitialSolution(players, structure);
  console.log('[SOLVER] Initial state - RED:', initialState.teams.get('RED')?.length, 'BLUE:', initialState.teams.get('BLUE')?.length, 'Subs:', initialState.subs.length);

  // Optimize with simulated annealing
  const optimizedState = optimizeWithSA(initialState);
  console.log('[SOLVER] Optimized state - RED:', optimizedState.teams.get('RED')?.length, 'BLUE:', optimizedState.teams.get('BLUE')?.length, 'Subs:', optimizedState.subs.length);

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

  // Add subs with their bench team assignment
  for (const sub of optimizedState.subs) {
    assignments.push({
      playerId: sub.player.id,
      playerName: sub.player.name,
      team: 'SUB',
      role: positionAssignments.get(sub.player.id) || sub.player.mainPosition,
      benchTeam: sub.benchTeam,
    });
  }

  // Calculate team metrics
  const teamMetrics: TeamMetrics[] = [];

  for (const color of teamColors) {
    const teamAssignments = assignments.filter(a => a.team === color);
    if (teamAssignments.length === 0) continue;

    const teamPlayers = teamAssignments.map(a =>
      players.find(p => p.id === a.playerId)!
    );

    const skillSum = teamPlayers.reduce((s, p) => s + p.rating, 0);
    const ageSum = teamPlayers.reduce((s, p) => s + p.age, 0);
    const positions: Record<Position, number> = { GK: 0, DF: 0, MID: 0, ST: 0 };

    teamAssignments.forEach(a => positions[a.role]++);

    const hasGK = positions.GK > 0 || teamPlayers.some(p => canPlayPosition(p, 'GK'));

    if (!hasGK && teamPlayers.length >= 4) {
      warnings.push(`Team ${color} is missing a dedicated goalkeeper.`);
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

  // Add sub metrics if any
  if (optimizedState.subs.length > 0) {
    const subPlayers = optimizedState.subs.map(s => s.player);
    const skillSum = subPlayers.reduce((s, p) => s + p.rating, 0);
    const ageSum = subPlayers.reduce((s, p) => s + p.age, 0);
    const positions: Record<Position, number> = { GK: 0, DF: 0, MID: 0, ST: 0 };
    subPlayers.forEach(p => positions[p.mainPosition]++);

    teamMetrics.push({
      team: 'SUB',
      playerCount: subPlayers.length,
      skillSum,
      skillAvg: Math.round((skillSum / subPlayers.length) * 100) / 100,
      ageSum,
      ageAvg: Math.round((ageSum / subPlayers.length) * 100) / 100,
      hasGoalkeeper: false,
      positions,
    });
  }

  const solveTimeMs = performance.now() - startTime;

  // Generate summary message
  const teamSummary = teamColors
    .map(c => `${c}: ${optimizedState.teams.get(c)?.length || 0}`)
    .join(', ');
  const subSummary = optimizedState.subs.length > 0
    ? `, Subs: ${optimizedState.subs.length}`
    : '';

  return {
    success: true,
    message: `Teams generated (${teamSummary}${subSummary}) in ${Math.round(solveTimeMs)}ms`,
    assignments,
    teamMetrics,
    warnings,
    solveTimeMs,
  };
}

/**
 * Normalize position string to valid Position type
 */
function normalizePosition(pos: string | null | undefined): Position | null {
  if (!pos) return null;
  const upper = pos.toUpperCase().trim();
  if (['GK', 'DF', 'MID', 'ST'].includes(upper)) {
    return upper as Position;
  }
  // Handle common variations
  if (upper === 'GOALKEEPER' || upper === 'GOALIE') return 'GK';
  if (upper === 'DEFENDER' || upper === 'DEF' || upper === 'CB' || upper === 'LB' || upper === 'RB') return 'DF';
  if (upper === 'MIDFIELDER' || upper === 'CM' || upper === 'CDM' || upper === 'CAM' || upper === 'LM' || upper === 'RM') return 'MID';
  if (upper === 'STRIKER' || upper === 'FORWARD' || upper === 'FW' || upper === 'CF' || upper === 'LW' || upper === 'RW') return 'ST';
  return 'MID'; // Default fallback
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
    mainPosition: normalizePosition(p.main_position) || 'MID',
    altPosition: normalizePosition(p.alt_position),
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
