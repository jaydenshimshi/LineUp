/**
 * Admin Players API
 * POST: Create a player manually (without user account)
 * PATCH: Update admin-created player
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      organization_id,
      full_name,
      age,
      main_position,
      alt_position,
      rating_stars,
    } = body;

    if (!organization_id || !full_name || !age || !main_position) {
      return NextResponse.json(
        { error: 'Missing required fields: organization_id, full_name, age, main_position' },
        { status: 400 }
      );
    }

    // Check if user is admin of the organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organization_id)
      .single();

    const role = (membership as { role: string } | null)?.role;
    if (!role || !['admin', 'owner'].includes(role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient();

    // Create player without user_id (admin-created player)
    const { data: player, error: playerError } = await adminSupabase
      .from('players')
      .insert({
        organization_id,
        full_name,
        age,
        main_position,
        alt_position: alt_position || null,
        profile_completed: true,
        user_id: null, // No user account linked
      } as never)
      .select()
      .single();

    if (playerError) {
      console.error('Error creating player:', playerError);
      return NextResponse.json(
        { error: `Failed to create player: ${playerError.message}` },
        { status: 500 }
      );
    }

    const playerData = player as { id: string };

    // If rating provided, create the rating
    if (rating_stars && rating_stars >= 1 && rating_stars <= 5) {
      await adminSupabase.from('player_admin_ratings').insert({
        player_id: playerData.id,
        organization_id,
        rating_stars,
        rated_by_admin_id: user.id,
      } as never);
    }

    return NextResponse.json({ player }, { status: 201 });
  } catch (error) {
    console.error('Admin Players API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      player_id,
      organization_id,
      full_name,
      age,
      main_position,
      alt_position,
    } = body;

    if (!player_id || !organization_id) {
      return NextResponse.json(
        { error: 'Missing required fields: player_id, organization_id' },
        { status: 400 }
      );
    }

    // Check if user is admin of the organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organization_id)
      .single();

    const role = (membership as { role: string } | null)?.role;
    if (!role || !['admin', 'owner'].includes(role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient();

    // Update player
    const { data: player, error } = await adminSupabase
      .from('players')
      .update({
        full_name,
        age,
        main_position,
        alt_position: alt_position || null,
      } as never)
      .eq('id', player_id)
      .eq('organization_id', organization_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating player:', error);
      return NextResponse.json(
        { error: `Failed to update player: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ player });
  } catch (error) {
    console.error('Admin Players API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const player_id = searchParams.get('player_id');
    const organization_id = searchParams.get('organization_id');

    if (!player_id || !organization_id) {
      return NextResponse.json(
        { error: 'Missing required params: player_id, organization_id' },
        { status: 400 }
      );
    }

    // Check if user is admin of the organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organization_id)
      .single();

    const role = (membership as { role: string } | null)?.role;
    if (!role || !['admin', 'owner'].includes(role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient();

    // Only allow deleting admin-created players (no user_id)
    const { data: player } = await adminSupabase
      .from('players')
      .select('user_id')
      .eq('id', player_id)
      .eq('organization_id', organization_id)
      .single();

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    if ((player as { user_id: string | null }).user_id) {
      return NextResponse.json(
        { error: 'Cannot delete players with linked user accounts' },
        { status: 400 }
      );
    }

    // Delete ratings first
    await adminSupabase
      .from('player_admin_ratings')
      .delete()
      .eq('player_id', player_id);

    // Delete checkins
    await adminSupabase
      .from('checkins')
      .delete()
      .eq('player_id', player_id);

    // Delete player
    const { error } = await adminSupabase
      .from('players')
      .delete()
      .eq('id', player_id)
      .eq('organization_id', organization_id);

    if (error) {
      console.error('Error deleting player:', error);
      return NextResponse.json(
        { error: `Failed to delete player: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin Players API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
