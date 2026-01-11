/**
 * Organization Members API Route
 *
 * Manages members of an organization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

/**
 * GET /api/organizations/[orgId]/members
 * Get all members of an organization
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check membership
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // Get all members with user and player data
    const { data: members, error } = await supabase
      .from('memberships')
      .select(`
        id,
        role,
        joined_at,
        user_id,
        users (
          id,
          email
        ),
        players (
          id,
          full_name,
          profile_completed
        )
      `)
      .eq('organization_id', orgId)
      .order('role', { ascending: true })
      .order('joined_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ members });
  } catch (err) {
    console.error('Members GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/organizations/[orgId]/members
 * Update a member's role (admin/owner only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    // Check admin/owner using admin client to bypass RLS
    const { data: currentMembership } = await adminSupabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single();

    const currentRole = (currentMembership as { role: string } | null)?.role;
    if (!currentRole || !['admin', 'owner'].includes(currentRole)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, newRole } = body;

    if (!userId || !newRole) {
      return NextResponse.json(
        { error: 'User ID and new role are required' },
        { status: 400 }
      );
    }

    if (!['member', 'admin', 'owner'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Only owners can promote to owner or demote owners
    if (newRole === 'owner' && currentRole !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can promote to owner' },
        { status: 403 }
      );
    }

    // Get target user's current role
    const { data: targetMembership } = await adminSupabase
      .from('memberships')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .single();

    const targetRole = (targetMembership as { role: string } | null)?.role;

    if (targetRole === 'owner' && currentRole !== 'owner') {
      return NextResponse.json(
        { error: 'Cannot modify owner role' },
        { status: 403 }
      );
    }

    // Prevent last owner from being demoted
    if (targetRole === 'owner' && newRole !== 'owner') {
      const { count } = await adminSupabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('role', 'owner');

      if ((count || 0) <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last owner' },
          { status: 400 }
        );
      }
    }

    // Update role using admin client to bypass RLS
    const { error } = await adminSupabase
      .from('memberships')
      .update({ role: newRole })
      .eq('user_id', userId)
      .eq('organization_id', orgId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Role updated to ${newRole}`,
    });
  } catch (err) {
    console.error('Members PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/organizations/[orgId]/members
 * Remove a member (admin/owner only, or self)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if self-removal or admin action
    const isSelf = userId === user.id;

    if (!isSelf) {
      // Check admin/owner using admin client
      const { data: membership } = await adminSupabase
        .from('memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', orgId)
        .single();

      const role = (membership as { role: string } | null)?.role;
      if (!role || !['admin', 'owner'].includes(role)) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }

    // Prevent removing last owner
    const { data: targetMembership } = await adminSupabase
      .from('memberships')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .single();

    if ((targetMembership as { role: string } | null)?.role === 'owner') {
      const { count } = await adminSupabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('role', 'owner');

      if ((count || 0) <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last owner. Transfer ownership first.' },
          { status: 400 }
        );
      }
    }

    // Get player ID for this user in this org (if exists)
    const { data: playerData } = await adminSupabase
      .from('players')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .single();

    const playerId = (playerData as { id: string } | null)?.id;

    if (playerId) {
      // Delete team assignments for this player
      await adminSupabase
        .from('team_assignments')
        .delete()
        .eq('player_id', playerId);

      // Delete ratings for this player
      await adminSupabase
        .from('player_admin_ratings')
        .delete()
        .eq('player_id', playerId);

      // Delete check-ins for this player
      await adminSupabase
        .from('checkins')
        .delete()
        .eq('player_id', playerId);

      // Delete the player record
      await adminSupabase
        .from('players')
        .delete()
        .eq('id', playerId);
    }

    // Remove membership using admin client to bypass RLS
    const { error } = await adminSupabase
      .from('memberships')
      .delete()
      .eq('user_id', userId)
      .eq('organization_id', orgId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: isSelf ? 'You have left the group' : 'Member removed',
    });
  } catch (err) {
    console.error('Members DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
