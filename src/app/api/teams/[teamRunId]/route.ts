/**
 * Team Run API Route
 *
 * DELETE: Delete a team run and its assignments
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ teamRunId: string }>;
}

/**
 * DELETE /api/teams/[teamRunId]
 * Delete a team run and all its assignments
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { teamRunId } = await params;
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient();

    // Get the team run to verify it exists and get organization_id
    const { data: teamRun, error: teamRunError } = await adminSupabase
      .from('team_runs')
      .select('id, organization_id, status')
      .eq('id', teamRunId)
      .single();

    if (teamRunError || !teamRun) {
      return NextResponse.json({ error: 'Team run not found' }, { status: 404 });
    }

    const teamRunData = teamRun as { id: string; organization_id: string; status: string };

    // Verify user is admin of this organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', teamRunData.organization_id)
      .single();

    const role = (membership as { role: string } | null)?.role;
    if (!role || !['admin', 'owner'].includes(role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if team run is locked
    if (teamRunData.status === 'locked') {
      return NextResponse.json({ error: 'Cannot delete locked team run' }, { status: 403 });
    }

    // Delete assignments first (foreign key constraint)
    const { error: deleteAssignmentsError } = await adminSupabase
      .from('team_assignments')
      .delete()
      .eq('team_run_id', teamRunId);

    if (deleteAssignmentsError) {
      console.error('Error deleting assignments:', deleteAssignmentsError);
      return NextResponse.json({ error: 'Failed to delete team assignments' }, { status: 500 });
    }

    // Delete the team run
    const { error: deleteRunError } = await adminSupabase
      .from('team_runs')
      .delete()
      .eq('id', teamRunId);

    if (deleteRunError) {
      console.error('Error deleting team run:', deleteRunError);
      return NextResponse.json({ error: 'Failed to delete team run' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Team run deleted successfully',
    });
  } catch (err) {
    console.error('Delete team run error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
