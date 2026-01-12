/**
 * Check-ins API route
 * Handles check-in operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/checkins
 * Get check-ins for a specific date
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Verify authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get check-ins for the date
    const { data, error } = await supabase
      .from('checkins')
      .select(`
        id,
        player_id,
        date,
        status,
        created_at,
        players(id, full_name, main_position, alt_position)
      `)
      .eq('date', date)
      .eq('status', 'checked_in');

    if (error) {
      console.error('Error fetching check-ins:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ checkins: data });
  } catch (err) {
    console.error('Check-ins GET error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/checkins
 * Create or update a check-in
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Verify authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { playerId, date, status, organizationId } = body;

    if (!playerId || !date || !organizationId) {
      return NextResponse.json(
        { error: 'playerId, date, and organizationId are required' },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for verification
    // Verify player belongs to user and organization
    const { data: playerData } = await adminSupabase
      .from('players')
      .select('id, user_id, organization_id')
      .eq('id', playerId)
      .single();

    if (!playerData) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    // Verify player belongs to user
    if (playerData.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to check in this player' },
        { status: 403 }
      );
    }

    // Verify player belongs to the organization
    if (playerData.organization_id !== organizationId) {
      return NextResponse.json(
        { error: 'Player does not belong to this organization' },
        { status: 403 }
      );
    }

    // Upsert check-in using admin client to bypass RLS
    const checkinData = {
      player_id: playerId,
      date,
      status: status || 'checked_in',
      organization_id: organizationId,
    };

    const { data, error } = await adminSupabase
      .from('checkins')
      .upsert(checkinData as never, { onConflict: 'player_id,date' })
      .select()
      .single();

    if (error) {
      console.error('Error creating check-in:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Revalidate the check-in pages to ensure fresh data
    revalidatePath('/org/[slug]/checkin', 'page');

    return NextResponse.json({ checkin: data });
  } catch (err) {
    console.error('Check-ins POST error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/checkins
 * Remove a check-in
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Verify authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const date = searchParams.get('date');
    const organizationId = searchParams.get('organizationId');

    if (!playerId || !date) {
      return NextResponse.json(
        { error: 'playerId and date are required' },
        { status: 400 }
      );
    }

    // Use admin client to verify player belongs to user
    const { data: playerData } = await adminSupabase
      .from('players')
      .select('id, user_id')
      .eq('id', playerId)
      .single();

    if (!playerData) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    // Verify player belongs to user
    if (playerData.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to check out this player' },
        { status: 403 }
      );
    }

    // Delete check-in using admin client
    let query = adminSupabase
      .from('checkins')
      .delete()
      .eq('player_id', playerId)
      .eq('date', date);

    // Also filter by organizationId if provided
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { error } = await query;

    if (error) {
      console.error('Error deleting check-in:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Revalidate the check-in pages to ensure fresh data
    revalidatePath('/org/[slug]/checkin', 'page');

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Check-ins DELETE error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
