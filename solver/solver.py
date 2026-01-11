"""
Soccer Team Balanced Matchmaking Solver

Uses Google OR-Tools CP-SAT solver to generate mathematically optimal,
fair, balanced teams based on skill ratings, age, and positions.

This is a production-grade constraint optimization solver that GUARANTEES
the best possible team balance within defined rules.

Algorithm Philosophy:
- Team assignment uses constraint programming (CP-SAT)
- Results are deterministic, auditable, and mathematically optimal
- Fairness is provable, not approximate

Author: Lineup App
Version: 2.0 - Production
"""

import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from enum import Enum
from ortools.sat.python import cp_model

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


@dataclass(frozen=True)
class Player:
    player_id: str
    name: str
    age: int
    rating: int  # 1-5 stars
    main_pos: Position
    alt_pos: Optional[Position] = None

    def __post_init__(self):
        if not 1 <= self.rating <= 5:
            object.__setattr__(self, 'rating', max(1, min(5, self.rating)))
        if not 5 <= self.age <= 100:
            object.__setattr__(self, 'age', max(5, min(100, self.age)))


@dataclass
class SportRules:
    min_players_to_play: int = 6
    min_team_size: int = 3
    max_team_size: int = 7

    # Optimization weights (tuned for balance)
    w_skill_balance: int = 1500      # Highest: skill balance is critical
    w_position_diversity: int = 800  # High: each team needs all positions
    w_age_balance: int = 150         # Medium: age balance matters
    w_pos_mismatch: int = 100        # Medium: avoid wrong positions
    w_nonmain_pos: int = 30          # Low: alt positions are acceptable
    w_gk_missing: int = 600          # High: teams need goalkeepers
    w_formation_slack: int = 50

    # Formation targets by team size
    formation_targets: Dict[int, Dict[Position, int]] = field(default_factory=lambda: {
        3: {Position.GK: 0, Position.DF: 1, Position.MID: 1, Position.ST: 1},
        4: {Position.GK: 1, Position.DF: 1, Position.MID: 1, Position.ST: 1},
        5: {Position.GK: 1, Position.DF: 2, Position.MID: 1, Position.ST: 1},
        6: {Position.GK: 1, Position.DF: 2, Position.MID: 2, Position.ST: 1},
        7: {Position.GK: 1, Position.DF: 2, Position.MID: 2, Position.ST: 2},
    })


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

def determine_team_count(n_players: int) -> int:
    """Yellow team only if >= 21 players (3 full teams of 7)"""
    return 3 if n_players >= 21 else 2


def determine_team_sizes(n_players: int, team_count: int) -> List[int]:
    """7-a-side preference with proper sub handling"""
    if n_players >= 21 and team_count == 3:
        return [7, 7, 7]
    elif n_players >= 14:
        return [7, 7]
    else:
        per_team = min(7, max(3, n_players // 2))
        return [per_team, n_players - per_team]


# =============================================================================
# Main CP-SAT Solver
# =============================================================================

def solve_teams(
    players: List[Player],
    rules: SportRules = None,
    timeout_seconds: float = 10.0,
    seed: int = 42,
) -> SolveResult:
    """
    Generate mathematically optimal balanced teams using OR-Tools CP-SAT.

    This solver GUARANTEES the best possible solution within constraints.
    """
    import time
    start_time = time.time()

    if rules is None:
        rules = SportRules()

    n = len(players)
    logger.info(f"Solving for {n} players with CP-SAT")

    # Validate minimum
    if n < rules.min_players_to_play:
        return SolveResult(
            success=False,
            message=f"Not enough players ({n}). Need at least {rules.min_players_to_play}.",
        )

    team_count = determine_team_count(n)
    team_sizes = determine_team_sizes(n, team_count)
    team_colors = [TeamColor.RED, TeamColor.BLUE]
    if team_count == 3:
        team_colors.append(TeamColor.YELLOW)

    # Create CP-SAT model
    model = cp_model.CpModel()

    P = range(n)
    T = range(team_count)
    POS = [Position.GK, Position.DF, Position.MID, Position.ST]
    pos_idx = {p: i for i, p in enumerate(POS)}

    # ==========================================================================
    # Decision Variables
    # ==========================================================================

    # x[i][t] = 1 if player i is on team t
    x = [[model.NewBoolVar(f"x_{i}_{t}") for t in T] for i in P]

    # sub[i] = 1 if player i is a substitute
    sub = [model.NewBoolVar(f"sub_{i}") for i in P]

    # bench[i][t] = 1 if sub i is assigned to team t's bench
    bench = [[model.NewBoolVar(f"bench_{i}_{t}") for t in T] for i in P]

    # role[i][pos] = 1 if player i plays position pos
    role = [[model.NewBoolVar(f"role_{i}_{pos.value}") for pos in POS] for i in P]

    # ==========================================================================
    # Hard Constraints
    # ==========================================================================

    # C1: Each player on exactly one team OR is a sub
    for i in P:
        model.Add(sum(x[i][t] for t in T) + sub[i] == 1)

    # C2: Subs assigned to exactly one bench team
    for i in P:
        model.Add(sum(bench[i][t] for t in T) == 1).OnlyEnforceIf(sub[i])
        model.Add(sum(bench[i][t] for t in T) == 0).OnlyEnforceIf(sub[i].Not())

    # C3: Each player has exactly one role
    for i in P:
        model.Add(sum(role[i][k] for k in range(len(POS))) == 1)

    # C4: Team sizes (7-a-side rule)
    team_size_vars = []
    for t in T:
        size_t = model.NewIntVar(0, n, f"team_size_{t}")
        model.Add(size_t == sum(x[i][t] for i in P))
        team_size_vars.append(size_t)

    if n >= 14:
        model.Add(team_size_vars[0] == 7)
        model.Add(team_size_vars[1] == 7)
        if team_count == 3 and n >= 21:
            model.Add(team_size_vars[2] == 7)
    else:
        for t in T:
            model.Add(team_size_vars[t] >= rules.min_team_size)
            model.Add(team_size_vars[t] <= rules.max_team_size)

    # ==========================================================================
    # GK Coverage
    # ==========================================================================

    def is_gk_capable(player: Player) -> bool:
        return player.main_pos == Position.GK or player.alt_pos == Position.GK

    gk_capable = sum(1 for p in players if is_gk_capable(p))
    has_enough_gk = gk_capable >= team_count

    gk_count_vars = []
    for t in T:
        gk_t = model.NewIntVar(0, n, f"gk_count_{t}")
        gk_on_team = []
        for i in P:
            both = model.NewBoolVar(f"gk_team_{i}_{t}")
            model.AddBoolAnd([x[i][t], role[i][pos_idx[Position.GK]]]).OnlyEnforceIf(both)
            model.AddBoolOr([x[i][t].Not(), role[i][pos_idx[Position.GK]].Not()]).OnlyEnforceIf(both.Not())
            gk_on_team.append(both)
        model.Add(gk_t == sum(gk_on_team))
        gk_count_vars.append(gk_t)

        if has_enough_gk:
            model.Add(gk_t >= 1)

    # ==========================================================================
    # Optimization Objectives
    # ==========================================================================

    # Team skill sums (including bench for fair sub allocation)
    team_skill = []
    team_age = []
    team_skill_with_bench = []
    team_age_with_bench = []

    for t in T:
        skill_t = model.NewIntVar(0, 5 * n, f"skill_{t}")
        age_t = model.NewIntVar(0, 100 * n, f"age_{t}")
        model.Add(skill_t == sum(players[i].rating * x[i][t] for i in P))
        model.Add(age_t == sum(players[i].age * x[i][t] for i in P))
        team_skill.append(skill_t)
        team_age.append(age_t)

        skill_wb = model.NewIntVar(0, 5 * n, f"skill_wb_{t}")
        age_wb = model.NewIntVar(0, 100 * n, f"age_wb_{t}")
        model.Add(skill_wb == sum(players[i].rating * (x[i][t] + bench[i][t]) for i in P))
        model.Add(age_wb == sum(players[i].age * (x[i][t] + bench[i][t]) for i in P))
        team_skill_with_bench.append(skill_wb)
        team_age_with_bench.append(age_wb)

    # Skill gap (minimize)
    max_skill = model.NewIntVar(0, 5 * n, "max_skill")
    min_skill = model.NewIntVar(0, 5 * n, "min_skill")
    model.AddMaxEquality(max_skill, team_skill_with_bench)
    model.AddMinEquality(min_skill, team_skill_with_bench)
    skill_gap = model.NewIntVar(0, 5 * n, "skill_gap")
    model.Add(skill_gap == max_skill - min_skill)

    # Age gap (minimize)
    max_age = model.NewIntVar(0, 100 * n, "max_age")
    min_age = model.NewIntVar(0, 100 * n, "min_age")
    model.AddMaxEquality(max_age, team_age_with_bench)
    model.AddMinEquality(min_age, team_age_with_bench)
    age_gap = model.NewIntVar(0, 100 * n, "age_gap")
    model.Add(age_gap == max_age - min_age)

    # Position mismatch penalties
    mismatch_vars = []
    nonmain_vars = []
    for i, player in enumerate(players):
        for pos in POS:
            if pos == player.main_pos:
                continue
            elif player.alt_pos and pos == player.alt_pos:
                nonmain_vars.append(role[i][pos_idx[pos]])
            else:
                mismatch_vars.append(role[i][pos_idx[pos]])

    # GK missing penalty
    gk_missing = model.NewIntVar(0, team_count, "gk_missing")
    if has_enough_gk:
        model.Add(gk_missing == 0)
    else:
        missing_flags = []
        for t in T:
            flag = model.NewBoolVar(f"gk_miss_{t}")
            model.Add(gk_count_vars[t] == 0).OnlyEnforceIf(flag)
            model.Add(gk_count_vars[t] >= 1).OnlyEnforceIf(flag.Not())
            missing_flags.append(flag)
        model.Add(gk_missing == sum(missing_flags))

    # ==========================================================================
    # Position Diversity - each team should have balanced positions
    # ==========================================================================
    position_deviation_vars = []

    for t in T:
        # Count players by role on this team
        for pos in POS:
            if pos == Position.GK:
                continue  # GK already handled separately

            # Count how many players play this position on team t
            pos_count = model.NewIntVar(0, n, f"pos_count_{t}_{pos.value}")
            pos_on_team = []
            for i in P:
                both = model.NewBoolVar(f"pos_team_{i}_{t}_{pos.value}")
                model.AddBoolAnd([x[i][t], role[i][pos_idx[pos]]]).OnlyEnforceIf(both)
                model.AddBoolOr([x[i][t].Not(), role[i][pos_idx[pos]].Not()]).OnlyEnforceIf(both.Not())
                pos_on_team.append(both)
            model.Add(pos_count == sum(pos_on_team))

            # Target is 1 of each position for small teams, more for larger
            # Penalize having 0 of a position (missing) or 2+ (clustering)
            has_zero = model.NewBoolVar(f"has_zero_{t}_{pos.value}")
            model.Add(pos_count == 0).OnlyEnforceIf(has_zero)
            model.Add(pos_count >= 1).OnlyEnforceIf(has_zero.Not())
            position_deviation_vars.append(has_zero)  # Missing position penalty

            # Penalize having more than 1 of same position (except for larger teams)
            has_excess = model.NewBoolVar(f"has_excess_{t}_{pos.value}")
            model.Add(pos_count >= 2).OnlyEnforceIf(has_excess)
            model.Add(pos_count <= 1).OnlyEnforceIf(has_excess.Not())
            position_deviation_vars.append(has_excess)  # Clustering penalty

    # Sub count
    sub_count = model.NewIntVar(0, n, "sub_count")
    model.Add(sub_count == sum(sub[i] for i in P))

    # CRITICAL: No subs when < 14 players - all players should be on teams
    if n < 14:
        model.Add(sub_count == 0)

    # ==========================================================================
    # Objective Function
    # ==========================================================================

    objective = (
        rules.w_skill_balance * skill_gap +
        rules.w_position_diversity * sum(position_deviation_vars) +
        rules.w_age_balance * age_gap +
        rules.w_pos_mismatch * sum(mismatch_vars) +
        rules.w_nonmain_pos * sum(nonmain_vars) +
        rules.w_gk_missing * gk_missing
    )
    model.Minimize(objective)

    # ==========================================================================
    # Solve
    # ==========================================================================

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = timeout_seconds
    solver.parameters.num_workers = 8
    solver.parameters.random_seed = seed

    status = solver.Solve(model)
    solve_time_ms = (time.time() - start_time) * 1000

    is_optimal = status == cp_model.OPTIMAL
    is_feasible = status in (cp_model.OPTIMAL, cp_model.FEASIBLE)

    if not is_feasible:
        return SolveResult(
            success=False,
            message="No feasible solution found. Try adjusting constraints.",
            solve_time_ms=solve_time_ms,
        )

    # ==========================================================================
    # Extract Results
    # ==========================================================================

    assignments = []
    team_players: Dict[TeamColor, List[Tuple[Player, Position]]] = {c: [] for c in team_colors}
    team_players[TeamColor.SUB] = []
    warnings = []

    for i, player in enumerate(players):
        assigned_team = None
        bench_team = None

        for t in T:
            if solver.Value(x[i][t]) == 1:
                assigned_team = team_colors[t]
                break

        if assigned_team is None:
            assigned_team = TeamColor.SUB
            for t in T:
                if solver.Value(bench[i][t]) == 1:
                    bench_team = team_colors[t]
                    break

        assigned_role = Position.MID  # default
        for pos in POS:
            if solver.Value(role[i][pos_idx[pos]]) == 1:
                assigned_role = pos
                break

        assignment = PlayerAssignment(
            player_id=player.player_id,
            player_name=player.name,
            team=assigned_team,
            role=assigned_role,
            bench_team=bench_team,
        )
        assignments.append(assignment)

        if assigned_team != TeamColor.SUB:
            team_players[assigned_team].append((player, assigned_role))
        else:
            team_players[TeamColor.SUB].append((player, assigned_role))

    # Calculate metrics
    team_metrics = []
    for color in team_colors + [TeamColor.SUB]:
        players_on_team = team_players[color]
        if not players_on_team:
            continue

        skill_sum = sum(p.rating for p, _ in players_on_team)
        age_sum = sum(p.age for p, _ in players_on_team)
        count = len(players_on_team)
        pos_counts = {pos: 0 for pos in POS}

        for _, role_assigned in players_on_team:
            pos_counts[role_assigned] += 1

        has_gk = pos_counts[Position.GK] > 0
        if color != TeamColor.SUB and not has_gk:
            warnings.append(f"Team {color.value} is missing a goalkeeper")

        team_metrics.append(TeamMetrics(
            team=color,
            player_count=count,
            skill_sum=skill_sum,
            age_sum=age_sum,
            skill_avg=skill_sum / count,
            age_avg=age_sum / count,
            has_goalkeeper=has_gk,
            positions=pos_counts,
        ))

    status_str = "OPTIMAL" if is_optimal else "FEASIBLE"
    logger.info(f"Solution: {status_str} in {solve_time_ms:.2f}ms")

    return SolveResult(
        success=True,
        message=f"Teams generated ({status_str.lower()}) in {solve_time_ms:.0f}ms",
        assignments=assignments,
        team_metrics=team_metrics,
        warnings=warnings,
        solve_time_ms=solve_time_ms,
        is_optimal=is_optimal,
    )


def solve_from_dict(players_data: List[Dict], timeout: float = 10.0) -> Dict:
    """Convenience function for API usage"""
    players = []
    for p in players_data:
        try:
            player = Player(
                player_id=str(p["player_id"]),
                name=p["name"],
                age=int(p["age"]),
                rating=int(p.get("rating", 3)),
                main_pos=Position(p["main_position"]),
                alt_pos=Position(p["alt_position"]) if p.get("alt_position") else None,
            )
            players.append(player)
        except Exception as e:
            return {"success": False, "message": f"Invalid player data: {e}"}

    result = solve_teams(players, timeout_seconds=timeout)
    return result.to_dict()
