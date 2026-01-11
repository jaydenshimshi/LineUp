/**
 * Players API route handler
 * Supports multi-tenant player profiles
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/players - Get current user's player profile(s)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const organization_id = searchParams.get('organization_id');

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = supabase.from('players').select('*').eq('user_id', user.id);

    if (organization_id) {
      query = query.eq('organization_id', organization_id);
    }

    const { data: players, error } = await query;

    if (error) {
      console.error('Error fetching player:', error);
      return NextResponse.json(
        { error: 'Failed to fetch player' },
        { status: 500 }
      );
    }

    // Return single player if organization_id was specified
    if (organization_id) {
      return NextResponse.json({ player: players?.[0] || null });
    }

    return NextResponse.json({ players });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/players - Create player profile for an organization
 */
export async function POST(request: Request) {
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
      contact_email,
      contact_phone,
      contact_opt_in,
      profile_completed,
    } = body;

    if (!organization_id || !full_name || !age || !main_position) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify user is member of the organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', organization_id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    // Check if player already exists for this org
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', organization_id)
      .single();

    if (existingPlayer) {
      return NextResponse.json(
        { error: 'Player profile already exists. Use PATCH to update.' },
        { status: 400 }
      );
    }

    const { data: player, error } = await supabase
      .from('players')
      .insert({
        user_id: user.id,
        organization_id,
        full_name,
        age,
        main_position,
        alt_position: alt_position || null,
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        contact_opt_in: contact_opt_in || false,
        profile_completed: profile_completed || true,
      } as never)
      .select()
      .single();

    if (error) {
      console.error('Error creating player:', error);
      return NextResponse.json(
        { error: 'Failed to create player' },
        { status: 500 }
      );
    }

    // Update membership with player_id
    const playerData = player as { id: string };
    await supabase
      .from('memberships')
      .update({ player_id: playerData.id } as never)
      .eq('user_id', user.id)
      .eq('organization_id', organization_id);

    return NextResponse.json({ player }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/players - Update player profile
 */
export async function PATCH(request: Request) {
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
      contact_email,
      contact_phone,
      contact_opt_in,
      profile_completed,
    } = body;

    if (!player_id && !organization_id) {
      return NextResponse.json(
        { error: 'player_id or organization_id required' },
        { status: 400 }
      );
    }

    // Build update query
    let query = supabase.from('players').update({
      full_name,
      age,
      main_position,
      alt_position: alt_position || null,
      contact_email: contact_email || null,
      contact_phone: contact_phone || null,
      contact_opt_in: contact_opt_in || false,
      profile_completed: profile_completed !== undefined ? profile_completed : true,
    } as never);

    if (player_id) {
      query = query.eq('id', player_id);
    } else {
      query = query.eq('user_id', user.id).eq('organization_id', organization_id);
    }

    // Ensure user can only update their own profile
    query = query.eq('user_id', user.id);

    const { data: player, error } = await query.select().single();

    if (error) {
      console.error('Error updating player:', error);
      return NextResponse.json(
        { error: 'Failed to update player' },
        { status: 500 }
      );
    }

    return NextResponse.json({ player });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/players - Update player profile (alias for PATCH)
 */
export async function PUT(request: Request) {
  return PATCH(request);
}
