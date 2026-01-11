/**
 * Team Balancing Solver v4.0 - Robust Position-Aware
 *
 * Multi-strategy algorithm that:
 * 1. Groups players by position (GK, DF, MID, ST)
 * 2. Tries multiple drafting strategies
 * 3. Optimizes with swaps
 * 4. Picks the best result
 *
 * Strategies:
 * - Position-aware draft: Distribute by position first, balance skill
 * - Snake draft: Classic skill-based alternating picks
 * - Balanced hybrid: Ensure position coverage, then snake draft
 */

// Types
export type Position = 'GK' | 'DF' | 'MID' | 'ST';
export type TeamColor = 'RED' | 'BLUE' | 'YELLOW' | 'SUB';

export interface Player {
  id: string;
  name: string;
  age: number;
  rating: number;
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

// =============================================================================
// Team Structure
// =============================================================================

function determineTeamStructure(nPlayers: number): {
  teamCount: number;
  teamSizes: number[];
  subCount: number;
  teamColors: TeamColor[];
} {
  if (nPlayers >= 21) {
    return {
      teamCount: 3,
      teamSizes: [7, 7, 7],
      subCount: nPlayers - 21,
      teamColors: ['RED', 'BLUE', 'YELLOW'],
    };
  } else if (nPlayers > 14) {
    return {
      teamCount: 2,
      teamSizes: [7, 7],
      subCount: nPlayers - 14,
      teamColors: ['RED', 'BLUE'],
    };
  } else {
    const team1 = Math.ceil(nPlayers / 2);
    const team2 = nPlayers - team1;
    return {
      teamCount: 2,
      teamSizes: [team1, team2],
      subCount: 0,
      teamColors: ['RED', 'BLUE'],
    };
  }
}

// =============================================================================
// Scoring Functions
// =============================================================================

function getSkillSum(players: Player[]): number {
  return players.reduce((sum, p) => sum + p.rating, 0);
}

function getPositionCounts(players: Player[]): Record<Position, number> {
  const counts: Record<Position, number> = { GK: 0, DF: 0, MID: 0, ST: 0 };
  for (const p of players) {
    counts[p.mainPosition]++;
  }
  return counts;
}

interface SolutionScore {
  total: number;
  skillGap: number;
  positionScore: number;
  details: {
    skillSums: number[];
    teamIssues: string[][];
  };
}

function calculateSolutionScore(teams: Player[][]): SolutionScore {
  if (!teams.length || teams.some(t => !t.length)) {
    return {
      total: Infinity,
      skillGap: 999,
      positionScore: 999,
      details: { skillSums: [], teamIssues: [] },
    };
  }

  // Skill balance
  const skillSums = teams.map(t => getSkillSum(t));
  const skillGap = Math.max(...skillSums) - Math.min(...skillSums);
  const skillScore = skillGap * 100;

  // Position diversity
  let positionScore = 0;
  const teamIssues: string[][] = [];

  for (const team of teams) {
    const issues: string[] = [];
    const posCounts = getPositionCounts(team);

    for (const pos of ['DF', 'MID', 'ST'] as Position[]) {
      if (posCounts[pos] === 0) {
        const canCover = team.some(p => p.altPosition === pos);
        if (canCover) {
          positionScore += 10;
          issues.push(`Missing ${pos} (coverable)`);
        } else {
          positionScore += 50;
          issues.push(`Missing ${pos}`);
        }
      } else if (posCounts[pos] >= 2) {
        const excess = posCounts[pos] - 1;
        positionScore += 15 * excess;
        issues.push(`${posCounts[pos]}x ${pos}`);
      }
    }

    if (posCounts.GK === 0) {
      const canCover = team.some(p => p.altPosition === 'GK');
      if (!canCover) {
        positionScore += 100;
        issues.push('No GK!');
      }
    }

    teamIssues.push(issues);
  }

  // Age balance (minor)
  const ageSums = teams.map(t => t.reduce((s, p) => s + p.age, 0));
  const ageGap = Math.max(...ageSums) - Math.min(...ageSums);
  const ageScore = ageGap * 0.5;

  return {
    total: skillScore + positionScore + ageScore,
    skillGap,
    positionScore,
    details: { skillSums, teamIssues },
  };
}

// =============================================================================
// Draft Strategies
// =============================================================================

function strategyPositionAwareDraft(
  players: Player[],
  teamCount: number,
  teamSizes: number[]
): Player[][] {
  const teams: Player[][] = Array.from({ length: teamCount }, () => []);
  const teamSkills = new Array(teamCount).fill(0);
  const assigned = new Set<string>();

  // Group by position
  const byPosition: Record<Position, Player[]> = { GK: [], DF: [], MID: [], ST: [] };
  for (const p of players) {
    byPosition[p.mainPosition].push(p);
  }

  // Sort each group by skill (descending)
  for (const pos of Object.keys(byPosition) as Position[]) {
    byPosition[pos].sort((a, b) => b.rating - a.rating);
  }

  // Draft order: GK, DF, MID, ST
  const draftOrder: Position[] = ['GK', 'DF', 'MID', 'ST'];

  for (const pos of draftOrder) {
    const posPlayers = byPosition[pos].filter(p => !assigned.has(p.id));

    for (const player of posPlayers) {
      let bestTeam = -1;
      let bestScore = Infinity;

      for (let t = 0; t < teamCount; t++) {
        if (teams[t].length >= teamSizes[t]) continue;

        const posCount = teams[t].filter(p => p.mainPosition === pos).length;
        const score = posCount * 1000 + teamSkills[t];

        if (score < bestScore) {
          bestScore = score;
          bestTeam = t;
        }
      }

      if (bestTeam >= 0) {
        teams[bestTeam].push(player);
        teamSkills[bestTeam] += player.rating;
        assigned.add(player.id);
      }
    }
  }

  // Handle remaining
  const remaining = players.filter(p => !assigned.has(p.id));
  for (const player of remaining) {
    const sortedTeams = [...Array(teamCount).keys()].sort(
      (a, b) => teamSkills[a] - teamSkills[b]
    );
    for (const t of sortedTeams) {
      if (teams[t].length < teamSizes[t]) {
        teams[t].push(player);
        teamSkills[t] += player.rating;
        break;
      }
    }
  }

  return teams;
}

function strategySnakeDraft(
  players: Player[],
  teamCount: number,
  teamSizes: number[]
): Player[][] {
  const teams: Player[][] = Array.from({ length: teamCount }, () => []);
  const sorted = [...players].sort((a, b) => b.rating - a.rating);
  const totalPlaying = teamSizes.reduce((a, b) => a + b, 0);
  const playingPlayers = sorted.slice(0, totalPlaying);

  let direction = 1;
  let teamIdx = 0;

  for (const player of playingPlayers) {
    teams[teamIdx].push(player);
    teamIdx += direction;

    if (teamIdx >= teamCount) {
      teamIdx = teamCount - 1;
      direction = -1;
    } else if (teamIdx < 0) {
      teamIdx = 0;
      direction = 1;
    }
  }

  return teams;
}

function strategyBalancedHybrid(
  players: Player[],
  teamCount: number,
  teamSizes: number[]
): Player[][] {
  const teams: Player[][] = Array.from({ length: teamCount }, () => []);
  const teamSkills = new Array(teamCount).fill(0);
  const assigned = new Set<string>();

  // Group by position
  const byPosition: Record<Position, Player[]> = { GK: [], DF: [], MID: [], ST: [] };
  for (const p of players) {
    byPosition[p.mainPosition].push(p);
  }
  for (const pos of Object.keys(byPosition) as Position[]) {
    byPosition[pos].sort((a, b) => b.rating - a.rating);
  }

  // Phase 1: Assign GKs
  const gks = [...byPosition.GK];
  for (let t = 0; t < Math.min(gks.length, teamCount); t++) {
    const gkIdx = t % 2 === 0 ? Math.floor(t / 2) : gks.length - 1 - Math.floor(t / 2);
    const gk = gks[gkIdx];
    if (gk && !assigned.has(gk.id)) {
      teams[t].push(gk);
      teamSkills[t] += gk.rating;
      assigned.add(gk.id);
    }
  }

  // Phase 2: Ensure each team gets one DF, MID, ST
  for (const pos of ['DF', 'MID', 'ST'] as Position[]) {
    const posPlayers = byPosition[pos].filter(p => !assigned.has(p.id));

    for (let t = 0; t < teamCount; t++) {
      const hasPos = teams[t].some(p => p.mainPosition === pos);
      if (hasPos || !posPlayers.length) continue;

      const avgSkill = teamSkills.reduce((a, b) => a + b, 0) / teamCount;
      const player = teamSkills[t] <= avgSkill ? posPlayers[0] : posPlayers[posPlayers.length - 1];

      if (teams[t].length < teamSizes[t]) {
        teams[t].push(player);
        teamSkills[t] += player.rating;
        assigned.add(player.id);
        posPlayers.splice(posPlayers.indexOf(player), 1);
      }
    }
  }

  // Phase 3: Snake draft remaining
  const remaining = players.filter(p => !assigned.has(p.id)).sort((a, b) => b.rating - a.rating);
  let direction = 1;
  let teamIdx = teamSkills.indexOf(Math.min(...teamSkills));

  for (const player of remaining) {
    let attempts = 0;
    while (teams[teamIdx].length >= teamSizes[teamIdx] && attempts < teamCount * 2) {
      teamIdx += direction;
      if (teamIdx >= teamCount) {
        teamIdx = teamCount - 1;
        direction = -1;
      } else if (teamIdx < 0) {
        teamIdx = 0;
        direction = 1;
      }
      attempts++;
    }

    if (teams[teamIdx].length < teamSizes[teamIdx]) {
      teams[teamIdx].push(player);
      teamSkills[teamIdx] += player.rating;
    }

    teamIdx += direction;
    if (teamIdx >= teamCount) {
      teamIdx = teamCount - 1;
      direction = -1;
    } else if (teamIdx < 0) {
      teamIdx = 0;
      direction = 1;
    }
  }

  return teams;
}

// =============================================================================
// Optimization
// =============================================================================

function optimizeWithSwaps(teams: Player[][], maxIterations = 50): Player[][] {
  const result = teams.map(t => [...t]);
  const teamCount = result.length;

  let currentScore = calculateSolutionScore(result);
  let improved = true;
  let iteration = 0;

  while (improved && iteration < maxIterations) {
    improved = false;
    iteration++;
    let bestSwap: [number, number, number, number] | null = null;
    let bestImprovement = 0;

    for (let t1 = 0; t1 < teamCount; t1++) {
      for (let t2 = t1 + 1; t2 < teamCount; t2++) {
        for (let p1 = 0; p1 < result[t1].length; p1++) {
          for (let p2 = 0; p2 < result[t2].length; p2++) {
            // Swap
            [result[t1][p1], result[t2][p2]] = [result[t2][p2], result[t1][p1]];
            const newScore = calculateSolutionScore(result);
            const improvement = currentScore.total - newScore.total;

            if (improvement > bestImprovement) {
              bestImprovement = improvement;
              bestSwap = [t1, p1, t2, p2];
            }

            // Undo
            [result[t1][p1], result[t2][p2]] = [result[t2][p2], result[t1][p1]];
          }
        }
      }
    }

    if (bestSwap && bestImprovement > 0) {
      const [t1, p1, t2, p2] = bestSwap;
      [result[t1][p1], result[t2][p2]] = [result[t2][p2], result[t1][p1]];
      currentScore = calculateSolutionScore(result);
      improved = true;
    }
  }

  return result;
}

// =============================================================================
// Main Solver
// =============================================================================

export function solveTeams(players: Player[]): SolveResult {
  const startTime = Date.now();
  const n = players.length;

  if (n < 6) {
    return {
      success: false,
      message: `Not enough players (${n}). Need at least 6.`,
      assignments: [],
      teamMetrics: [],
      warnings: [],
      solveTimeMs: Date.now() - startTime,
    };
  }

  const { teamCount, teamSizes, subCount, teamColors } = determineTeamStructure(n);
  const totalPlaying = teamSizes.reduce((a, b) => a + b, 0);
  const sortedPlayers = [...players].sort((a, b) => b.rating - a.rating);
  const playingPlayers = sortedPlayers.slice(0, totalPlaying);
  const subPlayers = sortedPlayers.slice(totalPlaying);

  // Try multiple strategies
  const strategies: [string, (p: Player[], tc: number, ts: number[]) => Player[][]][] = [
    ['position_aware', strategyPositionAwareDraft],
    ['snake_draft', strategySnakeDraft],
    ['balanced_hybrid', strategyBalancedHybrid],
  ];

  let bestTeams: Player[][] | null = null;
  let bestScore = Infinity;
  let bestStrategy = '';

  for (const [name, strategyFn] of strategies) {
    try {
      let teams = strategyFn(playingPlayers, teamCount, teamSizes);
      teams = optimizeWithSwaps(teams);
      const score = calculateSolutionScore(teams);

      console.log(`[SOLVER] Strategy '${name}': score=${score.total.toFixed(1)}, gap=${score.skillGap}`);

      if (score.total < bestScore) {
        bestScore = score.total;
        bestTeams = teams;
        bestStrategy = name;
      }
    } catch (e) {
      console.error(`[SOLVER] Strategy '${name}' failed:`, e);
    }
  }

  if (!bestTeams) {
    return {
      success: false,
      message: 'All strategies failed.',
      assignments: [],
      teamMetrics: [],
      warnings: [],
      solveTimeMs: Date.now() - startTime,
    };
  }

  console.log(`[SOLVER] Best strategy: '${bestStrategy}' with score ${bestScore.toFixed(1)}`);

  // Assign roles
  const assignments: PlayerAssignment[] = [];
  const warnings: string[] = [];

  for (let t = 0; t < bestTeams.length; t++) {
    const team = bestTeams[t];
    const color = teamColors[t];
    const posCounts = getPositionCounts(team);
    const assignedRoles: Record<string, Position> = {};

    // First pass: main positions
    for (const player of team) {
      assignedRoles[player.id] = player.mainPosition;
    }

    // Second pass: use alts to fill gaps
    for (const pos of ['DF', 'MID', 'ST'] as Position[]) {
      if (posCounts[pos] === 0) {
        for (const player of team) {
          if (player.altPosition === pos) {
            const currentRole = assignedRoles[player.id];
            if (posCounts[currentRole] > 1) {
              assignedRoles[player.id] = pos;
              posCounts[currentRole]--;
              posCounts[pos]++;
              break;
            }
          }
        }
      }
    }

    for (const player of team) {
      assignments.push({
        playerId: player.id,
        playerName: player.name,
        team: color,
        role: assignedRoles[player.id],
      });
    }
  }

  // Add subs
  for (let i = 0; i < subPlayers.length; i++) {
    const player = subPlayers[i];
    assignments.push({
      playerId: player.id,
      playerName: player.name,
      team: 'SUB',
      role: player.mainPosition,
      benchTeam: teamColors[i % teamCount],
    });
  }

  // Calculate metrics
  const teamMetrics: TeamMetrics[] = [];

  for (let t = 0; t < bestTeams.length; t++) {
    const team = bestTeams[t];
    const color = teamColors[t];
    const skillSum = team.reduce((s, p) => s + p.rating, 0);
    const ageSum = team.reduce((s, p) => s + p.age, 0);
    const count = team.length;

    const posCounts: Record<Position, number> = { GK: 0, DF: 0, MID: 0, ST: 0 };
    for (const a of assignments) {
      if (a.team === color) {
        posCounts[a.role]++;
      }
    }

    const hasGK = posCounts.GK > 0;
    if (!hasGK) {
      warnings.push(`Team ${color} is missing a goalkeeper`);
    }

    for (const pos of ['DF', 'MID', 'ST'] as Position[]) {
      if (posCounts[pos] === 0) {
        warnings.push(`Team ${color} has no ${pos}`);
      } else if (posCounts[pos] >= 2) {
        warnings.push(`Team ${color} has ${posCounts[pos]} ${pos}s`);
      }
    }

    teamMetrics.push({
      team: color,
      playerCount: count,
      skillSum,
      skillAvg: count > 0 ? skillSum / count : 0,
      ageSum,
      ageAvg: count > 0 ? ageSum / count : 0,
      hasGoalkeeper: hasGK,
      positions: posCounts,
    });
  }

  const skillSums = teamMetrics.map(m => m.skillSum);
  const skillGap = Math.max(...skillSums) - Math.min(...skillSums);
  if (skillGap > 2) {
    warnings.push(`Skill gap of ${skillGap} points between teams`);
  }

  return {
    success: true,
    message: `Teams generated (strategy: ${bestStrategy})`,
    assignments,
    teamMetrics,
    warnings,
    solveTimeMs: Date.now() - startTime,
  };
}

// =============================================================================
// API Helpers
// =============================================================================

interface APIPlayer {
  player_id: string;
  name: string;
  age: number;
  rating?: number;
  main_position: string;
  alt_position?: string | null;
}

export function parsePlayersFromAPI(data: APIPlayer[]): Player[] {
  return data.map(p => ({
    id: p.player_id,
    name: p.name,
    age: p.age,
    rating: p.rating || 3,
    mainPosition: p.main_position as Position,
    altPosition: p.alt_position as Position | null,
  }));
}

export function formatResultForAPI(result: SolveResult): Record<string, unknown> {
  return {
    success: result.success,
    message: result.message,
    assignments: result.assignments.map(a => ({
      player_id: a.playerId,
      player_name: a.playerName,
      team: a.team,
      role: a.role,
      bench_team: a.benchTeam,
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
