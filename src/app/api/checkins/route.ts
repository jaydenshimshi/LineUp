/**
 * Check-ins API route
 * Handles check-in operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Verify authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { playerId, date, status, organizationId } = body;

    if (!playerId || !date) {
      return NextResponse.json(
        { error: 'playerId and date are required' },
        { status: 400 }
      );
    }

    // Verify player belongs to user (unless admin)
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = (userData as { role: string } | null)?.role === 'admin';

    if (!isAdmin) {
      const { data: playerData } = await supabase
        .from('players')
        .select('id')
        .eq('id', playerId)
        .eq('user_id', user.id)
        .single();

      if (!playerData) {
        return NextResponse.json(
          { error: 'Not authorized to check in this player' },
          { status: 403 }
        );
      }
    }

    // Upsert check-in
    const checkinData: Record<string, unknown> = {
      player_id: playerId,
      date,
      status: status || 'checked_in',
    };

    if (organizationId) {
      checkinData.organization_id = organizationId;
    }

    const { data, error } = await supabase
      .from('checkins')
      .upsert(checkinData as never, { onConflict: 'player_id,date' })
      .select()
      .single();

    if (error) {
      console.error('Error creating check-in:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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

    if (!playerId || !date) {
      return NextResponse.json(
        { error: 'playerId and date are required' },
        { status: 400 }
      );
    }

    // Verify player belongs to user (unless admin)
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = (userData as { role: string } | null)?.role === 'admin';

    if (!isAdmin) {
      const { data: playerData } = await supabase
        .from('players')
        .select('id')
        .eq('id', playerId)
        .eq('user_id', user.id)
        .single();

      if (!playerData) {
        return NextResponse.json(
          { error: 'Not authorized to check out this player' },
          { status: 403 }
        );
      }
    }

    // Delete check-in
    const { error } = await supabase
      .from('checkins')
      .delete()
      .eq('player_id', playerId)
      .eq('date', date);

    if (error) {
      console.error('Error deleting check-in:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Check-ins DELETE error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
