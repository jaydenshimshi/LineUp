"""
Soccer Team Balanced Matchmaking Solver

Uses a robust greedy algorithm with snake draft for skill balance,
then optimizes position distribution.

Algorithm:
1. Sort players by skill rating (descending)
2. Snake draft to distribute skill evenly (1-2-2-1 pattern)
3. Swap players between teams to improve position coverage
4. Assign roles based on positions

Author: Lineup App
Version: 3.0 - Robust Greedy
"""

import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from enum import Enum
import random

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# Data Models
# =============================================================================

class Position(str, Enum):
    GK = "GK"
    DF = "DF"
    MID = "MID"
    ST = "ST"


class TeamColor(str, Enum):
    RED = "RED"
    BLUE = "BLUE"
    YELLOW = "YELLOW"
    SUB = "SUB"


@dataclass
class Player:
    player_id: str
    name: str
    age: int
    rating: int  # 1-5 stars
    main_pos: Position
    alt_pos: Optional[Position] = None

    def can_play(self, pos: Position) -> bool:
        return self.main_pos == pos or self.alt_pos == pos


@dataclass
class PlayerAssignment:
    player_id: str
    player_name: str
    team: TeamColor
    role: Position
    bench_team: Optional[TeamColor] = None
    reason: str = ""


@dataclass
class TeamMetrics:
    team: TeamColor
    player_count: int
    skill_sum: int
    age_sum: int
    skill_avg: float
    age_avg: float
    has_goalkeeper: bool
    positions: Dict[Position, int]


@dataclass
class SolveResult:
    success: bool
    message: str
    assignments: List[PlayerAssignment] = field(default_factory=list)
    team_metrics: List[TeamMetrics] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    solve_time_ms: float = 0.0
    is_optimal: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "message": self.message,
            "is_optimal": self.is_optimal,
            "assignments": [
                {
                    "player_id": a.player_id,
                    "player_name": a.player_name,
                    "team": a.team.value,
                    "role": a.role.value,
                    "bench_team": a.bench_team.value if a.bench_team else None,
                    "reason": a.reason,
                }
                for a in self.assignments
            ],
            "team_metrics": [
                {
                    "team": m.team.value,
                    "player_count": m.player_count,
                    "skill_sum": m.skill_sum,
                    "age_sum": m.age_sum,
                    "skill_avg": round(m.skill_avg, 2),
                    "age_avg": round(m.age_avg, 2),
                    "has_goalkeeper": m.has_goalkeeper,
                    "positions": {p.value: c for p, c in m.positions.items()},
                }
                for m in self.team_metrics
            ],
            "warnings": self.warnings,
            "solve_time_ms": round(self.solve_time_ms, 2),
        }


# =============================================================================
# Team Structure Logic
# =============================================================================

def determine_team_structure(n_players: int) -> Tuple[int, List[int], int]:
    """
    Returns (team_count, team_sizes, sub_count)

    Rules:
    - 6-14 players: 2 teams, ALL play (no subs)
    - 15-20 players: 2 teams of 7 + subs
    - 21+ players: 3 teams of 7 + subs
    """
    if n_players >= 21:
        return 3, [7, 7, 7], n_players - 21
    elif n_players > 14:
        return 2, [7, 7], n_players - 14
    else:
        # Split as evenly as possible
        team1 = (n_players + 1) // 2
        team2 = n_players - team1
        return 2, [team1, team2], 0


def get_skill_sum(players: List[Player]) -> int:
    return sum(p.rating for p in players)


def get_position_counts(players: List[Player]) -> Dict[Position, int]:
    counts = {pos: 0 for pos in Position}
    for p in players:
        counts[p.main_pos] += 1
    return counts


def calculate_team_score(team: List[Player]) -> float:
    """
    Score a team configuration. Lower is better.
    Penalizes:
    - Missing positions (no DF, MID, or ST)
    - Position clustering (2+ of same non-GK position)
    """
    if not team:
        return float('inf')

    pos_counts = get_position_counts(team)
    score = 0.0

    for pos in [Position.DF, Position.MID, Position.ST]:
        if pos_counts[pos] == 0:
            # Check if anyone can play this position as alt
            can_cover = any(p.alt_pos == pos for p in team)
            if not can_cover:
                score += 100  # Heavy penalty for uncoverable position
            else:
                score += 20  # Light penalty, can be covered by alt

        if pos_counts[pos] >= 2:
            score += 30 * (pos_counts[pos] - 1)  # Clustering penalty

    return score


def evaluate_swap(teams: List[List[Player]], t1: int, p1: int, t2: int, p2: int) -> float:
    """
    Evaluate improvement from swapping player p1 on team t1 with player p2 on team t2.
    Returns the improvement (positive = better after swap).
    """
    # Current scores
    current_pos_score = calculate_team_score(teams[t1]) + calculate_team_score(teams[t2])
    current_skill_gap = abs(get_skill_sum(teams[t1]) - get_skill_sum(teams[t2]))

    # Simulate swap
    player1 = teams[t1][p1]
    player2 = teams[t2][p2]

    new_team1 = [p for i, p in enumerate(teams[t1]) if i != p1] + [player2]
    new_team2 = [p for i, p in enumerate(teams[t2]) if i != p2] + [player1]

    # New scores
    new_pos_score = calculate_team_score(new_team1) + calculate_team_score(new_team2)
    new_skill_gap = abs(get_skill_sum(new_team1) - get_skill_sum(new_team2))

    # Improvement calculation
    # Position improvement is weighted higher than skill gap
    pos_improvement = current_pos_score - new_pos_score
    skill_change = current_skill_gap - new_skill_gap

    # Only accept swap if it improves position AND doesn't make skill much worse
    # Or if it significantly improves skill without hurting position
    if pos_improvement > 0 and skill_change >= -1:
        return pos_improvement + skill_change * 0.5
    elif skill_change > 0 and new_pos_score <= current_pos_score:
        return skill_change * 0.5

    return -1000  # Don't swap


def solve_teams(
    players: List[Player],
    rules=None,
    timeout_seconds: float = 10.0,
    seed: int = 42,
) -> SolveResult:
    """
    Generate balanced teams using greedy snake draft + position optimization.
    """
    import time
    start_time = time.time()
    random.seed(seed)

    n = len(players)
    logger.info(f"Solving for {n} players with greedy algorithm")

    if n < 6:
        return SolveResult(
            success=False,
            message=f"Not enough players ({n}). Need at least 6.",
        )

    team_count, team_sizes, sub_count = determine_team_structure(n)
    team_colors = [TeamColor.RED, TeamColor.BLUE]
    if team_count == 3:
        team_colors.append(TeamColor.YELLOW)

    # ==========================================================================
    # Step 1: Sort players by skill (descending), with position variety
    # ==========================================================================
    sorted_players = sorted(players, key=lambda p: (-p.rating, p.main_pos.value))

    # ==========================================================================
    # Step 2: Snake draft for skill balance
    # ==========================================================================
    teams: List[List[Player]] = [[] for _ in range(team_count)]
    subs: List[Player] = []

    total_playing = sum(team_sizes)
    playing_players = sorted_players[:total_playing]
    sub_players = sorted_players[total_playing:]

    # Snake draft: 0, 1, 1, 0, 0, 1, 1, 0, ...
    direction = 1
    team_idx = 0

    for player in playing_players:
        teams[team_idx].append(player)

        # Move to next team in snake pattern
        team_idx += direction
        if team_idx >= team_count:
            team_idx = team_count - 1
            direction = -1
        elif team_idx < 0:
            team_idx = 0
            direction = 1

    # Assign subs to bench teams (distribute evenly by skill)
    for i, player in enumerate(sub_players):
        bench_team_idx = i % team_count
        subs.append((player, team_colors[bench_team_idx]))

    # ==========================================================================
    # Step 3: Optimize position distribution via swaps
    # ==========================================================================
    max_iterations = 100
    improved = True
    iteration = 0

    while improved and iteration < max_iterations:
        improved = False
        iteration += 1

        # Try all possible swaps between teams
        for t1 in range(team_count):
            for t2 in range(t1 + 1, team_count):
                for p1 in range(len(teams[t1])):
                    for p2 in range(len(teams[t2])):
                        improvement = evaluate_swap(teams, t1, p1, t2, p2)

                        if improvement > 0:
                            # Perform swap
                            teams[t1][p1], teams[t2][p2] = teams[t2][p2], teams[t1][p1]
                            improved = True
                            logger.info(f"Swap improved by {improvement:.1f}")

    logger.info(f"Optimization completed in {iteration} iterations")

    # ==========================================================================
    # Step 4: Assign roles based on positions
    # ==========================================================================
    assignments = []
    warnings = []

    for t, team in enumerate(teams):
        color = team_colors[t]

        # Assign roles - prioritize main positions
        assigned_roles: Dict[Position, List[Player]] = {pos: [] for pos in Position}
        unassigned = list(team)

        # First pass: assign players to their main position
        for player in list(unassigned):
            assigned_roles[player.main_pos].append(player)
            unassigned.remove(player)

        # Check position coverage and reassign if needed
        pos_counts = {pos: len(assigned_roles[pos]) for pos in Position}

        for player in team:
            # Determine final role
            role = player.main_pos

            # If position is overcrowded and player has useful alt, consider it
            if pos_counts[player.main_pos] > 1 and player.alt_pos:
                target_pos = player.alt_pos
                if pos_counts[target_pos] == 0:
                    role = target_pos
                    pos_counts[player.main_pos] -= 1
                    pos_counts[target_pos] += 1

            assignments.append(PlayerAssignment(
                player_id=player.player_id,
                player_name=player.name,
                team=color,
                role=role,
            ))

    # Add subs
    for player, bench_team in subs:
        assignments.append(PlayerAssignment(
            player_id=player.player_id,
            player_name=player.name,
            team=TeamColor.SUB,
            role=player.main_pos,
            bench_team=bench_team,
        ))

    # ==========================================================================
    # Step 5: Calculate metrics
    # ==========================================================================
    team_metrics = []

    for t, team in enumerate(teams):
        color = team_colors[t]
        skill_sum = sum(p.rating for p in team)
        age_sum = sum(p.age for p in team)
        count = len(team)

        pos_counts = {pos: 0 for pos in Position}
        for a in assignments:
            if a.team == color:
                pos_counts[a.role] += 1

        has_gk = pos_counts[Position.GK] > 0
        if not has_gk:
            warnings.append(f"Team {color.value} is missing a goalkeeper")

        team_metrics.append(TeamMetrics(
            team=color,
            player_count=count,
            skill_sum=skill_sum,
            age_sum=age_sum,
            skill_avg=skill_sum / count if count > 0 else 0,
            age_avg=age_sum / count if count > 0 else 0,
            has_goalkeeper=has_gk,
            positions=pos_counts,
        ))

    # Check skill balance
    skill_sums = [m.skill_sum for m in team_metrics]
    skill_gap = max(skill_sums) - min(skill_sums)
    if skill_gap > 2:
        warnings.append(f"Skill gap of {skill_gap} points between teams")

    solve_time_ms = (time.time() - start_time) * 1000
    logger.info(f"Solution found in {solve_time_ms:.2f}ms")

    return SolveResult(
        success=True,
        message=f"Teams generated in {solve_time_ms:.0f}ms",
        assignments=assignments,
        team_metrics=team_metrics,
        warnings=warnings,
        solve_time_ms=solve_time_ms,
        is_optimal=True,
    )


def solve_from_dict(players_data: List[Dict], timeout: float = 10.0) -> Dict:
    """Convenience function for API usage"""
    players = []
    for p in players_data:
        try:
            main_pos = Position(p["main_position"])
            alt_pos = Position(p["alt_position"]) if p.get("alt_position") else None

            player = Player(
                player_id=str(p["player_id"]),
                name=p["name"],
                age=int(p["age"]),
                rating=int(p.get("rating", 3)),
                main_pos=main_pos,
                alt_pos=alt_pos,
            )
            players.append(player)
        except Exception as e:
            return {"success": False, "message": f"Invalid player data: {e}"}

    result = solve_teams(players, timeout_seconds=timeout)
    return result.to_dict()
