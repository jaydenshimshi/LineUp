/**
 * Check-in counts API route
 * Get check-in counts for multiple dates
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/checkins/counts
 * Get check-in counts for specified dates
 * Query params: dates (comma-separated YYYY-MM-DD)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const datesParam = searchParams.get('dates');

    if (!datesParam) {
      return NextResponse.json(
        { error: 'dates parameter is required' },
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

    const dates = datesParam.split(',').map((d) => d.trim());

    // Get counts for each date
    const counts: Record<string, number> = {};

    for (const date of dates) {
      const { count } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .eq('date', date)
        .eq('status', 'checked_in');

      counts[date] = count || 0;
    }

    return NextResponse.json({ counts });
  } catch (err) {
    console.error('Check-in counts error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
