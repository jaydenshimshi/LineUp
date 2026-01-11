/**
 * Teams API Route
 *
 * Handles team run CRUD operations (save, publish, lock).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type TeamRunStatus = 'draft' | 'published' | 'locked';

interface TeamAssignment {
  player_id: string;
  team_color: string;
  assigned_role: string;
  bench_team?: string | null;
  is_manual_override: boolean;
  assignment_reason?: string;
}

/**
 * GET /api/teams
 * Get team run for a specific date
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    // Verify authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get team run with assignments
    const { data: teamRun, error } = await supabase
      .from('team_runs')
      .select(`
        *,
        team_assignments(
          *,
          players(id, full_name, main_position, alt_position)
        )
      `)
      .eq('date', date)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching team run:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ teamRun });
  } catch (err) {
    console.error('Teams GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/teams
 * Create or update team run with assignments
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if ((userData as { role: string } | null)?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { date, assignments, status = 'draft' } = body as {
      date: string;
      assignments: TeamAssignment[];
      status?: TeamRunStatus;
    };

    if (!date || !assignments) {
      return NextResponse.json(
        { error: 'Date and assignments are required' },
        { status: 400 }
      );
    }

    // Check if team run already exists
    const { data: existingRun } = await supabase
      .from('team_runs')
      .select('id, status')
      .eq('date', date)
      .single();

    // Don't allow updates to locked teams
    if (existingRun && (existingRun as { status: string }).status === 'locked') {
      return NextResponse.json(
        { error: 'Cannot modify locked team run' },
        { status: 403 }
      );
    }

    let teamRunId: string;

    if (existingRun) {
      // Update existing run
      const { error: updateError } = await supabase
        .from('team_runs')
        .update({
          status,
          algorithm_version: 'v1.0-ortools',
        } as never)
        .eq('id', (existingRun as { id: string }).id);

      if (updateError) {
        console.error('Error updating team run:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      teamRunId = (existingRun as { id: string }).id;

      // Delete existing assignments
      await supabase
        .from('team_assignments')
        .delete()
        .eq('team_run_id', teamRunId);
    } else {
      // Create new run
      const { data: newRun, error: createError } = await supabase
        .from('team_runs')
        .insert({
          date,
          status,
          algorithm_version: 'v1.0-ortools',
          created_by: user.id,
        } as never)
        .select()
        .single();

      if (createError) {
        console.error('Error creating team run:', createError);
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }

      teamRunId = (newRun as { id: string }).id;
    }

    // Insert new assignments
    const assignmentRows = assignments.map((a) => ({
      team_run_id: teamRunId,
      player_id: a.player_id,
      team_color: a.team_color.toLowerCase(),
      assigned_role: a.assigned_role,
      is_manual_override: a.is_manual_override || false,
      assignment_reason: a.assignment_reason || null,
    }));

    const { error: assignError } = await supabase
      .from('team_assignments')
      .insert(assignmentRows as never);

    if (assignError) {
      console.error('Error inserting assignments:', assignError);
      return NextResponse.json({ error: assignError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      teamRunId,
      status,
      message:
        status === 'published'
          ? 'Teams published successfully'
          : status === 'locked'
            ? 'Teams locked successfully'
            : 'Teams saved as draft',
    });
  } catch (err) {
    console.error('Teams POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/teams
 * Update team run status (publish, lock)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if ((userData as { role: string } | null)?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { teamRunId, status } = body as { teamRunId: string; status: TeamRunStatus };

    if (!teamRunId || !status) {
      return NextResponse.json(
        { error: 'teamRunId and status are required' },
        { status: 400 }
      );
    }

    // Get current status
    const { data: currentRun } = await supabase
      .from('team_runs')
      .select('status')
      .eq('id', teamRunId)
      .single();

    if (!currentRun) {
      return NextResponse.json({ error: 'Team run not found' }, { status: 404 });
    }

    // Prevent modifying locked teams
    if ((currentRun as { status: string }).status === 'locked') {
      return NextResponse.json(
        { error: 'Cannot modify locked team run' },
        { status: 403 }
      );
    }

    // Update status
    const { error: updateError } = await supabase
      .from('team_runs')
      .update({ status } as never)
      .eq('id', teamRunId);

    if (updateError) {
      console.error('Error updating team run status:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status,
      message:
        status === 'published'
          ? 'Teams published - players can now see their assignments'
          : status === 'locked'
            ? 'Teams locked - no further changes allowed'
            : 'Teams saved as draft',
    });
  } catch (err) {
    console.error('Teams PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
