"""
Soccer Team Balanced Matchmaking Solver v4.0

Robust algorithm with position-aware drafting and multi-strategy optimization.

Algorithm:
1. Group players by position (GK, DF, MID, ST)
2. Draft by position - ensure each team gets coverage
3. Balance skill within each position group
4. Run multiple strategies and pick the best result
5. Final swap optimization for fine-tuning

Author: Lineup App
Version: 4.0 - Robust Position-Aware
"""

import logging
import os
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from enum import Enum
from copy import deepcopy
from datetime import datetime
import random

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Debug file path - in the solver directory
DEBUG_FILE = os.path.join(os.path.dirname(__file__), 'solver_debug.log')

def debug_log(message: str):
    """Write debug message to file"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    with open(DEBUG_FILE, 'a') as f:
        f.write(f"[{timestamp}] {message}\n")


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
    checked_in_at: Optional[datetime] = None  # For first-come-first-serve sub determination

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
    """
    if n_players >= 21:
        return 3, [7, 7, 7], n_players - 21
    elif n_players > 14:
        return 2, [7, 7], n_players - 14
    else:
        team1 = (n_players + 1) // 2
        team2 = n_players - team1
        return 2, [team1, team2], 0


# =============================================================================
# Scoring Functions
# =============================================================================

def get_skill_sum(players: List[Player]) -> int:
    return sum(p.rating for p in players)


def get_position_counts(players: List[Player]) -> Dict[Position, int]:
    counts = {pos: 0 for pos in Position}
    for p in players:
        counts[p.main_pos] += 1
    return counts


def calculate_solution_score(teams: List[List[Player]], team_count: int) -> Tuple[float, Dict]:
    """
    Score a complete solution. Lower is better.
    Returns (score, details_dict)
    """
    if not teams or not all(teams):
        return float('inf'), {}

    # Skill balance score
    skill_sums = [get_skill_sum(t) for t in teams]
    skill_gap = max(skill_sums) - min(skill_sums)
    skill_score = skill_gap * 100  # Heavy weight on skill balance

    # Position diversity score
    position_score = 0
    position_details = []

    for t, team in enumerate(teams):
        pos_counts = get_position_counts(team)
        team_detail = {"team": t, "positions": dict(pos_counts), "issues": []}

        for pos in [Position.DF, Position.MID, Position.ST]:
            if pos_counts[pos] == 0:
                # Check if coverable by alt
                can_cover = any(p.alt_pos == pos for p in team)
                if can_cover:
                    position_score += 10  # Minor penalty
                    team_detail["issues"].append(f"Missing {pos.value} (coverable)")
                else:
                    position_score += 50  # Major penalty
                    team_detail["issues"].append(f"Missing {pos.value}")

            elif pos_counts[pos] >= 2:
                # Clustering penalty (increases with more clustering)
                excess = pos_counts[pos] - 1
                position_score += 15 * excess
                team_detail["issues"].append(f"{pos_counts[pos]}x {pos.value}")

        # GK checks - penalize both missing GK and multiple GKs
        if pos_counts[Position.GK] == 0:
            can_cover = any(p.alt_pos == Position.GK for p in team)
            if not can_cover:
                position_score += 100  # Very heavy penalty
                team_detail["issues"].append("No GK!")
        elif pos_counts[Position.GK] >= 2:
            # Heavy penalty for multiple GKs - teams should have exactly 1 GK
            excess = pos_counts[Position.GK] - 1
            position_score += 80 * excess  # Heavier than field position clustering
            team_detail["issues"].append(f"{pos_counts[Position.GK]}x GK")

        position_details.append(team_detail)

    # Age balance (minor factor)
    age_sums = [sum(p.age for p in t) for t in teams]
    age_gap = max(age_sums) - min(age_sums)
    age_score = age_gap * 0.5

    total_score = skill_score + position_score + age_score

    details = {
        "skill_gap": skill_gap,
        "skill_sums": skill_sums,
        "position_score": position_score,
        "position_details": position_details,
        "total_score": total_score,
    }

    return total_score, details


# =============================================================================
# Draft Strategies
# =============================================================================

def strategy_position_aware_draft(players: List[Player], team_count: int, team_sizes: List[int]) -> List[List[Player]]:
    """
    Draft players by position group, ensuring each team gets coverage.
    """
    teams: List[List[Player]] = [[] for _ in range(team_count)]
    team_skills = [0] * team_count
    assigned = set()

    # Group players by position
    by_position: Dict[Position, List[Player]] = {pos: [] for pos in Position}
    for p in players:
        by_position[p.main_pos].append(p)

    # Sort each group by skill (descending)
    for pos in by_position:
        by_position[pos].sort(key=lambda p: -p.rating)

    # Target: how many of each position per team (for team size 4: 1 GK, 1 DF, 1 MID, 1 ST)
    avg_team_size = sum(team_sizes) // team_count

    # Draft order: GK first (most scarce usually), then DF, MID, ST
    draft_order = [Position.GK, Position.DF, Position.MID, Position.ST]

    for pos in draft_order:
        pos_players = [p for p in by_position[pos] if p.player_id not in assigned]

        # Distribute this position's players across teams
        # Give to team with lowest skill first (for balance)
        for player in pos_players:
            # Find team with fewest of this position AND lowest skill
            # that still has room
            best_team = None
            best_score = float('inf')

            for t in range(team_count):
                if len(teams[t]) >= team_sizes[t]:
                    continue  # Team is full

                pos_count = sum(1 for p in teams[t] if p.main_pos == pos)
                # Prefer teams with fewer of this position, then lower skill
                score = pos_count * 1000 + team_skills[t]

                if score < best_score:
                    best_score = score
                    best_team = t

            if best_team is not None:
                teams[best_team].append(player)
                team_skills[best_team] += player.rating
                assigned.add(player.player_id)

    # Handle any remaining players (shouldn't happen normally)
    remaining = [p for p in players if p.player_id not in assigned]
    for player in remaining:
        # Add to team with lowest skill that has room
        for t in sorted(range(team_count), key=lambda x: team_skills[x]):
            if len(teams[t]) < team_sizes[t]:
                teams[t].append(player)
                team_skills[t] += player.rating
                break

    return teams


def strategy_snake_draft(players: List[Player], team_count: int, team_sizes: List[int]) -> List[List[Player]]:
    """
    Classic snake draft by skill rating.
    """
    teams: List[List[Player]] = [[] for _ in range(team_count)]
    sorted_players = sorted(players, key=lambda p: -p.rating)

    total_playing = sum(team_sizes)
    playing_players = sorted_players[:total_playing]

    direction = 1
    team_idx = 0

    for player in playing_players:
        teams[team_idx].append(player)
        team_idx += direction

        if team_idx >= team_count:
            team_idx = team_count - 1
            direction = -1
        elif team_idx < 0:
            team_idx = 0
            direction = 1

    return teams


def strategy_balanced_hybrid(players: List[Player], team_count: int, team_sizes: List[int]) -> List[List[Player]]:
    """
    Hybrid: Assign critical positions first (GK, then one of each), then snake draft the rest.
    """
    teams: List[List[Player]] = [[] for _ in range(team_count)]
    team_skills = [0] * team_count
    assigned = set()

    # Group by position
    by_position: Dict[Position, List[Player]] = {pos: [] for pos in Position}
    for p in players:
        by_position[p.main_pos].append(p)
    for pos in by_position:
        by_position[pos].sort(key=lambda p: -p.rating)

    # Phase 1: Ensure each team gets one GK (if available)
    gks = by_position[Position.GK][:]
    for t in range(min(len(gks), team_count)):
        # Assign GK to team, alternating best/worst for balance
        if t % 2 == 0:
            gk = gks[t // 2] if t // 2 < len(gks) else None
        else:
            gk = gks[-(t // 2 + 1)] if (t // 2 + 1) <= len(gks) else None

        if gk and gk.player_id not in assigned:
            teams[t].append(gk)
            team_skills[t] += gk.rating
            assigned.add(gk.player_id)

    # Phase 2: Ensure each team gets at least one of DF, MID, ST
    for pos in [Position.DF, Position.MID, Position.ST]:
        pos_players = [p for p in by_position[pos] if p.player_id not in assigned]

        for t in range(team_count):
            # Check if team already has this position
            has_pos = any(p.main_pos == pos for p in teams[t])
            if has_pos or not pos_players:
                continue

            # Assign to balance skill
            if team_skills[t] <= sum(team_skills) / team_count:
                # Team is below average, give them a good player
                player = pos_players[0]
            else:
                # Team is above average, give them a weaker player
                player = pos_players[-1]

            if len(teams[t]) < team_sizes[t]:
                teams[t].append(player)
                team_skills[t] += player.rating
                assigned.add(player.player_id)
                pos_players.remove(player)

    # Phase 3: Snake draft remaining players
    remaining = [p for p in players if p.player_id not in assigned]
    remaining.sort(key=lambda p: -p.rating)

    direction = 1
    # Start with team that has lowest skill
    team_idx = min(range(team_count), key=lambda t: team_skills[t])

    for player in remaining:
        # Find next team with room, following snake pattern
        attempts = 0
        while len(teams[team_idx]) >= team_sizes[team_idx] and attempts < team_count * 2:
            team_idx += direction
            if team_idx >= team_count:
                team_idx = team_count - 1
                direction = -1
            elif team_idx < 0:
                team_idx = 0
                direction = 1
            attempts += 1

        if len(teams[team_idx]) < team_sizes[team_idx]:
            teams[team_idx].append(player)
            team_skills[team_idx] += player.rating

        team_idx += direction
        if team_idx >= team_count:
            team_idx = team_count - 1
            direction = -1
        elif team_idx < 0:
            team_idx = 0
            direction = 1

    return teams


# =============================================================================
# Optimization
# =============================================================================

def optimize_with_swaps(teams: List[List[Player]], max_iterations: int = 50) -> List[List[Player]]:
    """
    Optimize team assignment by trying beneficial swaps.
    """
    teams = deepcopy(teams)
    team_count = len(teams)

    current_score, _ = calculate_solution_score(teams, team_count)
    improved = True
    iteration = 0

    while improved and iteration < max_iterations:
        improved = False
        iteration += 1
        best_swap = None
        best_improvement = 0

        # Try all possible swaps
        for t1 in range(team_count):
            for t2 in range(t1 + 1, team_count):
                for p1 in range(len(teams[t1])):
                    for p2 in range(len(teams[t2])):
                        # Simulate swap
                        teams[t1][p1], teams[t2][p2] = teams[t2][p2], teams[t1][p1]
                        new_score, _ = calculate_solution_score(teams, team_count)
                        improvement = current_score - new_score

                        if improvement > best_improvement:
                            best_improvement = improvement
                            best_swap = (t1, p1, t2, p2)

                        # Undo swap
                        teams[t1][p1], teams[t2][p2] = teams[t2][p2], teams[t1][p1]

        # Apply best swap if found
        if best_swap and best_improvement > 0:
            t1, p1, t2, p2 = best_swap
            teams[t1][p1], teams[t2][p2] = teams[t2][p2], teams[t1][p1]
            current_score -= best_improvement
            improved = True

    return teams


# =============================================================================
# Main Solver
# =============================================================================

def solve_teams(
    players: List[Player],
    rules=None,
    timeout_seconds: float = 10.0,
    seed: int = 42,
) -> SolveResult:
    """
    Generate balanced teams using multiple strategies and picking the best.
    """
    import time
    start_time = time.time()
    random.seed(seed)

    n = len(players)
    debug_log(f"========== NEW SOLVE REQUEST ==========")
    debug_log(f"SOLVER: Python OR-Tools v4.0")
    debug_log(f"Solving for {n} players:")
    for p in players:
        alt = p.alt_pos.value if p.alt_pos else "none"
        debug_log(f"  - {p.name}: {p.rating}★ {p.main_pos.value} (alt: {alt})")

    if n < 6:
        return SolveResult(
            success=False,
            message=f"Not enough players ({n}). Need at least 6.",
        )

    team_count, team_sizes, sub_count = determine_team_structure(n)
    team_colors = [TeamColor.RED, TeamColor.BLUE]
    if team_count == 3:
        team_colors.append(TeamColor.YELLOW)

    total_playing = sum(team_sizes)

    # HYBRID APPROACH: First-come-first-serve for playing spots, skill-based for team balance
    # Sort by check-in time (earliest first) to determine who plays vs who becomes a sub
    # Players who checked in first get priority for playing spots
    def get_checkin_time(p: Player) -> datetime:
        if p.checked_in_at:
            return p.checked_in_at
        # Fallback: if no check-in time, use a very old date to keep original order
        return datetime.min

    sorted_by_checkin = sorted(players, key=get_checkin_time)
    playing_players = sorted_by_checkin[:total_playing]
    sub_players = sorted_by_checkin[total_playing:]

    debug_log(f"Playing: {len(playing_players)} (first to check in)")
    debug_log(f"Subs: {len(sub_players)} (checked in late)")

    # ==========================================================================
    # Try multiple strategies and pick the best
    # ==========================================================================
    strategies = [
        ("position_aware", strategy_position_aware_draft),
        ("snake_draft", strategy_snake_draft),
        ("balanced_hybrid", strategy_balanced_hybrid),
    ]

    best_teams = None
    best_score = float('inf')
    best_strategy = None
    all_results = []

    for strategy_name, strategy_fn in strategies:
        try:
            teams = strategy_fn(playing_players, team_count, team_sizes)

            # Optimize with swaps
            teams = optimize_with_swaps(teams)

            score, details = calculate_solution_score(teams, team_count)
            all_results.append({
                "strategy": strategy_name,
                "score": score,
                "skill_gap": details.get("skill_gap", 999),
                "details": details,
            })

            debug_log(f"Strategy '{strategy_name}': score={score:.1f}, skill_gap={details.get('skill_gap', '?')}, details={details.get('position_details', [])}")

            if score < best_score:
                best_score = score
                best_teams = teams
                best_strategy = strategy_name

        except Exception as e:
            debug_log(f"Strategy '{strategy_name}' FAILED: {e}")

    if best_teams is None:
        return SolveResult(
            success=False,
            message="All strategies failed to produce valid teams.",
        )

    debug_log(f"*** BEST STRATEGY: '{best_strategy}' with score {best_score:.1f} ***")

    # ==========================================================================
    # Assign roles intelligently
    # ==========================================================================
    assignments = []
    warnings = []

    for t, team in enumerate(best_teams):
        color = team_colors[t]

        # Track what positions are needed vs available
        pos_counts = get_position_counts(team)
        assigned_roles: Dict[str, Position] = {}

        # First pass: assign main positions
        for player in team:
            assigned_roles[player.player_id] = player.main_pos

        # Second pass: use alt positions to fill gaps
        for pos in [Position.DF, Position.MID, Position.ST]:
            if pos_counts[pos] == 0:
                # Try to find someone with this as alt who is in an overcrowded position
                for player in team:
                    if player.alt_pos == pos:
                        current_role = assigned_roles[player.player_id]
                        if pos_counts[current_role] > 1:
                            # Reassign this player
                            assigned_roles[player.player_id] = pos
                            pos_counts[current_role] -= 1
                            pos_counts[pos] += 1
                            break

        # Create assignments
        for player in team:
            role = assigned_roles[player.player_id]
            assignments.append(PlayerAssignment(
                player_id=player.player_id,
                player_name=player.name,
                team=color,
                role=role,
            ))

    # Add subs
    for i, player in enumerate(sub_players):
        bench_team = team_colors[i % team_count]
        assignments.append(PlayerAssignment(
            player_id=player.player_id,
            player_name=player.name,
            team=TeamColor.SUB,
            role=player.main_pos,
            bench_team=bench_team,
        ))

    # ==========================================================================
    # Calculate final metrics
    # ==========================================================================
    team_metrics = []

    for t, team in enumerate(best_teams):
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

        # Check for position issues
        for pos in [Position.DF, Position.MID, Position.ST]:
            if pos_counts[pos] == 0:
                warnings.append(f"Team {color.value} has no {pos.value}")
            elif pos_counts[pos] >= 2:
                warnings.append(f"Team {color.value} has {pos_counts[pos]} {pos.value}s")

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

    # Skill balance warning
    skill_sums = [m.skill_sum for m in team_metrics]
    skill_gap = max(skill_sums) - min(skill_sums)
    if skill_gap > 2:
        warnings.append(f"Skill gap of {skill_gap} points between teams")

    solve_time_ms = (time.time() - start_time) * 1000

    # Log final team compositions
    debug_log(f"Final teams:")
    for t, team in enumerate(best_teams):
        players_str = ", ".join([f"{p.name}({p.rating}★ {p.main_pos.value})" for p in team])
        debug_log(f"  Team {t}: [{players_str}] = {sum(p.rating for p in team)} pts")
    debug_log(f"Solution found in {solve_time_ms:.2f}ms using '{best_strategy}'")

    return SolveResult(
        success=True,
        message=f"Teams generated in {solve_time_ms:.0f}ms (strategy: {best_strategy})",
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

            # Parse checked_in_at timestamp for first-come-first-serve ordering
            checked_in_at = None
            if p.get("checked_in_at"):
                try:
                    # Handle ISO format timestamps
                    checked_in_str = p["checked_in_at"]
                    if checked_in_str.endswith('Z'):
                        checked_in_str = checked_in_str[:-1] + '+00:00'
                    checked_in_at = datetime.fromisoformat(checked_in_str.replace('Z', '+00:00'))
                except (ValueError, TypeError):
                    pass  # If parsing fails, leave as None

            player = Player(
                player_id=str(p["player_id"]),
                name=p["name"],
                age=int(p["age"]),
                rating=int(p.get("rating", 3)),
                main_pos=main_pos,
                alt_pos=alt_pos,
                checked_in_at=checked_in_at,
            )
            players.append(player)
        except Exception as e:
            return {"success": False, "message": f"Invalid player data: {e}"}

    result = solve_teams(players, timeout_seconds=timeout)
    return result.to_dict()
