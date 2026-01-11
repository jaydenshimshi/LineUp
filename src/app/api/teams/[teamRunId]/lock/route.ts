/**
 * Team Run Lock API
 * POST: Lock a team run to prevent further changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ teamRunId: string }>;
}

export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { teamRunId } = await context.params;
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the team run using admin client to bypass RLS
    const { data: teamRun, error: fetchError } = await adminSupabase
      .from('team_runs')
      .select('id, organization_id, status')
      .eq('id', teamRunId)
      .single();

    if (fetchError || !teamRun) {
      return NextResponse.json({ error: 'Team run not found' }, { status: 404 });
    }

    const teamRunData = teamRun as { id: string; organization_id: string; status: string };

    // Check if user is admin of the organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', teamRunData.organization_id)
      .single();

    const role = (membership as { role: string } | null)?.role;
    if (!role || !['admin', 'owner'].includes(role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Check if already locked
    if (teamRunData.status === 'locked') {
      return NextResponse.json(
        { error: 'Team run is already locked' },
        { status: 400 }
      );
    }

    // Must be published before locking
    if (teamRunData.status !== 'published') {
      return NextResponse.json(
        { error: 'Team run must be published before locking' },
        { status: 400 }
      );
    }

    // Update status to locked using admin client
    const { data: updatedTeamRun, error: updateError } = await adminSupabase
      .from('team_runs')
      .update({ status: 'locked', updated_at: new Date().toISOString() })
      .eq('id', teamRunId)
      .select()
      .single();

    if (updateError) {
      console.error('Error locking team run:', updateError);
      return NextResponse.json(
        { error: 'Failed to lock team run' },
        { status: 500 }
      );
    }

    return NextResponse.json({ teamRun: updatedTeamRun });
  } catch (error) {
    console.error('Lock API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
