/**
 * Player Check-ins API route
 * Get check-ins for a specific player
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/checkins/player
 * Get check-ins for a specific player within a date range
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const organizationId = searchParams.get('organizationId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!playerId || !organizationId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'playerId, organizationId, startDate, and endDate are required' },
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

    // Verify player belongs to user
    const { data: playerData } = await adminSupabase
      .from('players')
      .select('id, user_id')
      .eq('id', playerId)
      .single();

    if (!playerData || playerData.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to view this player\'s checkins' },
        { status: 403 }
      );
    }

    // Get check-ins for the date range (only 'checked_in' records)
    const { data, error } = await adminSupabase
      .from('checkins')
      .select('date, status')
      .eq('player_id', playerId)
      .eq('organization_id', organizationId)
      .eq('status', 'checked_in')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.error('Error fetching player check-ins:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ checkins: data || [] });
  } catch (err) {
    console.error('Player check-ins GET error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
