/**
 * Team Generation API Route
 *
 * Generates balanced teams using either:
 * 1. Python OR-Tools solver (if SOLVER_API_URL is set) - mathematically optimal
 * 2. Built-in TypeScript solver (fallback) - simulated annealing
 *
 * The Python solver uses Google OR-Tools CP-SAT constraint programming
 * to GUARANTEE the best possible team balance. Recommended for production.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  solveTeams,
  parsePlayersFromAPI,
  formatResultForAPI,
} from '@/lib/solver/team-solver';

interface PlayerData {
  player_id: string;
  name: string;
  age: number;
  rating: number;
  main_position: string;
  alt_position: string | null;
}

interface PythonSolverResponse {
  success: boolean;
  message: string;
  is_optimal?: boolean;
  assignments?: Array<{
    player_id: string;
    player_name: string;
    team: string;
    role: string;
    bench_team: string | null;
    reason?: string;
  }>;
  team_metrics?: Array<{
    team: string;
    player_count: number;
    skill_sum: number;
    age_sum: number;
    skill_avg: number;
    age_avg: number;
    has_goalkeeper: boolean;
    positions: Record<string, number>;
  }>;
  warnings?: string[];
  solve_time_ms?: number;
}

/**
 * Call the Python OR-Tools solver API
 */
async function callPythonSolver(playersData: PlayerData[]): Promise<PythonSolverResponse | null> {
  const solverUrl = process.env.SOLVER_API_URL;

  if (!solverUrl) {
    return null;
  }

  try {
    const response = await fetch(`${solverUrl}/api/solve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        players: playersData,
        options: {
          timeout_seconds: 10.0,
        },
      }),
    });

    if (!response.ok) {
      console.error(`Python solver returned ${response.status}`);
      return null;
    }

    const result = await response.json() as PythonSolverResponse;
    return result;
  } catch (error) {
    console.error('Failed to call Python solver:', error);
    return null;
  }
}

/**
 * POST /api/teams/generate
 *
 * Generate balanced teams for a specific date in an organization.
 *
 * Request body:
 * {
 *   "organization_id": "uuid",
 *   "date": "2024-01-15"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request
    const body = await request.json();
    const { organization_id, date } = body;

    if (!organization_id) {
      return NextResponse.json({ error: 'organization_id is required' }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    // Verify user is admin of this organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organization_id)
      .single();

    const role = (membership as { role: string } | null)?.role;
    if (!role || !['admin', 'owner'].includes(role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get checked-in players for the date with ratings (filtered by organization)
    const { data: checkinsData, error: checkinsError } = await supabase
      .from('checkins')
      .select(`
        player_id,
        players!inner(
          id,
          full_name,
          age,
          main_position,
          alt_position,
          organization_id,
          player_admin_ratings(rating_stars)
        )
      `)
      .eq('date', date)
      .eq('status', 'checked_in')
      .eq('organization_id', organization_id);

    if (checkinsError) {
      console.error('Error fetching check-ins:', checkinsError);
      return NextResponse.json({ error: 'Failed to fetch check-ins' }, { status: 500 });
    }

    interface CheckinWithPlayer {
      player_id: string;
      players: {
        id: string;
        full_name: string;
        age: number;
        main_position: string;
        alt_position: string | null;
        organization_id: string;
        player_admin_ratings: Array<{ rating_stars: number }> | null;
      };
    }

    const checkins = (checkinsData || []) as unknown as CheckinWithPlayer[];

    if (checkins.length < 6) {
      return NextResponse.json({
        success: false,
        message: `Not enough players (${checkins.length}). Need at least 6.`,
      });
    }

    // Format players for solver
    const playersData: PlayerData[] = checkins.map((c) => ({
      player_id: c.players.id,
      name: c.players.full_name,
      age: c.players.age,
      rating: c.players.player_admin_ratings?.[0]?.rating_stars || 3,
      main_position: c.players.main_position,
      alt_position: c.players.alt_position,
    }));

    // Try Python OR-Tools solver first (mathematically optimal)
    // Falls back to TypeScript solver if Python service unavailable
    let solverResult: {
      success: boolean;
      message: string;
      assignments: Array<{
        playerId: string;
        team: string;
        role: string;
        benchTeam?: string | null;
      }>;
      usedPythonSolver?: boolean;
      isOptimal?: boolean;
    };
    let response: Record<string, unknown>;

    const pythonResult = await callPythonSolver(playersData);

    if (pythonResult && pythonResult.success) {
      // Use Python solver result
      console.log(`Python OR-Tools solver succeeded (optimal: ${pythonResult.is_optimal})`);
      solverResult = {
        success: true,
        message: pythonResult.message,
        assignments: (pythonResult.assignments || []).map((a) => ({
          playerId: a.player_id,
          team: a.team,
          role: a.role,
          benchTeam: a.bench_team,
        })),
        usedPythonSolver: true,
        isOptimal: pythonResult.is_optimal,
      };
      response = {
        success: true,
        message: pythonResult.message,
        solver: 'ortools-cpsat',
        is_optimal: pythonResult.is_optimal,
        teams: pythonResult.team_metrics,
        assignments: pythonResult.assignments,
        warnings: pythonResult.warnings,
        solve_time_ms: pythonResult.solve_time_ms,
      };
    } else {
      // Fall back to TypeScript solver
      if (process.env.SOLVER_API_URL) {
        console.log('Python solver unavailable, falling back to TypeScript solver');
      }
      const players = parsePlayersFromAPI(playersData);
      const tsResult = solveTeams(players);
      const tsResponse = formatResultForAPI(tsResult);

      solverResult = {
        success: tsResult.success,
        message: tsResult.message,
        assignments: tsResult.assignments.map((a) => ({
          playerId: a.playerId,
          team: a.team,
          role: a.role,
          benchTeam: a.benchTeam,
        })),
        usedPythonSolver: false,
      };
      response = {
        ...tsResponse,
        solver: 'typescript-simulated-annealing',
      };
    }

    // If successful, save the team run to the database
    if (solverResult.success) {
      // Check if a team run already exists for this date
      const { data: existingRun } = await supabase
        .from('team_runs')
        .select('id')
        .eq('organization_id', organization_id)
        .eq('date', date)
        .single();

      let teamRunId: string;

      if (existingRun) {
        // Update existing run
        teamRunId = (existingRun as { id: string }).id;

        // Delete old assignments
        await supabase
          .from('team_assignments')
          .delete()
          .eq('team_run_id', teamRunId);

        // Update status back to draft
        await supabase
          .from('team_runs')
          .update({ status: 'draft', updated_at: new Date().toISOString() } as never)
          .eq('id', teamRunId);
      } else {
        // Create new team run
        const { data: newRun, error: runError } = await supabase
          .from('team_runs')
          .insert({
            organization_id,
            date,
            status: 'draft',
            created_by: user.id,
          } as never)
          .select('id')
          .single();

        if (runError || !newRun) {
          console.error('Error creating team run:', runError);
          return NextResponse.json({ error: 'Failed to save team run' }, { status: 500 });
        }

        teamRunId = (newRun as { id: string }).id;
      }

      // Insert new assignments
      const assignmentsToInsert = solverResult.assignments.map((a) => ({
        team_run_id: teamRunId,
        player_id: a.playerId,
        team_color: a.team.toLowerCase(),
        assigned_role: a.role,
        bench_team: a.benchTeam?.toLowerCase() || null,
      }));

      const { error: assignError } = await supabase
        .from('team_assignments')
        .insert(assignmentsToInsert as never);

      if (assignError) {
        console.error('Error saving assignments:', assignError);
        // Don't fail the request, teams were generated successfully
      }

      // Add team_run_id to response
      return NextResponse.json({
        ...response,
        team_run_id: teamRunId,
      });
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error('Team generation error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
