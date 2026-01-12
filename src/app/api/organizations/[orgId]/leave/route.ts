/**
 * API route for leaving an organization
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a member of this organization
    const { data: membership } = await adminSupabase
      .from('memberships')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this group' },
        { status: 400 }
      );
    }

    // Get user's player profile in this org
    const { data: player } = await adminSupabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single();

    // Delete associated data
    if (player) {
      // Delete check-ins
      await adminSupabase
        .from('checkins')
        .delete()
        .eq('player_id', player.id);

      // Delete team assignments
      await adminSupabase
        .from('team_assignments')
        .delete()
        .eq('player_id', player.id);

      // Delete player ratings
      await adminSupabase
        .from('player_admin_ratings')
        .delete()
        .eq('player_id', player.id);

      // Delete player profile
      await adminSupabase
        .from('players')
        .delete()
        .eq('id', player.id);
    }

    // Delete the membership
    await adminSupabase
      .from('memberships')
      .delete()
      .eq('id', membership.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error leaving organization:', error);
    return NextResponse.json(
      { error: 'Failed to leave group' },
      { status: 500 }
    );
  }
}
