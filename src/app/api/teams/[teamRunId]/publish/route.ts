/**
 * Team Run Publish API
 * POST: Publish a team run so players can see their assignments
 * Supports republishing after changes (unless locked)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ teamRunId: string }>;
}

export async function POST(
  request: NextRequest,
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

    // Cannot republish if locked
    if (teamRunData.status === 'locked') {
      return NextResponse.json(
        { error: 'Cannot republish a locked team run' },
        { status: 400 }
      );
    }

    // Update status to published (allows republishing from draft or published state)
    const { data: updatedTeamRun, error: updateError } = await adminSupabase
      .from('team_runs')
      .update({ status: 'published', updated_at: new Date().toISOString() })
      .eq('id', teamRunId)
      .select()
      .single();

    if (updateError) {
      console.error('Error publishing team run:', updateError);
      return NextResponse.json(
        { error: 'Failed to publish team run' },
        { status: 500 }
      );
    }

    const isRepublish = teamRunData.status === 'published';
    return NextResponse.json({
      teamRun: updatedTeamRun,
      message: isRepublish ? 'Teams republished with changes' : 'Teams published successfully'
    });
  } catch (error) {
    console.error('Publish API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
