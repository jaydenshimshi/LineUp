import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ teamRunId: string }>;
}

interface AssignmentUpdate {
  playerId: string;
  teamColor: 'red' | 'blue' | 'yellow' | 'sub';
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { teamRunId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the team run
    const { data: teamRunData, error: teamRunError } = await supabase
      .from('team_runs')
      .select('id, organization_id, status')
      .eq('id', teamRunId)
      .single();

    if (teamRunError || !teamRunData) {
      return NextResponse.json({ error: 'Team run not found' }, { status: 404 });
    }

    const teamRun = teamRunData as { id: string; organization_id: string; status: string };

    // Check if locked
    if (teamRun.status === 'locked') {
      return NextResponse.json(
        { error: 'Cannot modify locked teams' },
        { status: 400 }
      );
    }

    // Verify user is admin of this org
    const { data: membershipData } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', teamRun.organization_id)
      .single();

    const membership = membershipData as { role: string } | null;
    const role = membership?.role;
    if (!role || !['admin', 'owner'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const assignments = body.assignments as AssignmentUpdate[];

    // Update each assignment
    for (const assignment of assignments) {
      await supabase
        .from('team_assignments')
        .update({ team_color: assignment.teamColor } as never)
        .eq('team_run_id', teamRunId)
        .eq('player_id', assignment.playerId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update assignments error:', error);
    return NextResponse.json(
      { error: 'Failed to update assignments' },
      { status: 500 }
    );
  }
}
