/**
 * Admin Ratings API
 * POST: Create or update player skill rating
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
    const { player_id, organization_id, rating_stars } = body;

    if (!player_id || !organization_id || !rating_stars) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (rating_stars < 1 || rating_stars > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
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

    // Verify player belongs to this organization
    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('id', player_id)
      .eq('organization_id', organization_id)
      .single();

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Use admin client to bypass RLS (we've already verified admin status above)
    let adminSupabase;
    try {
      adminSupabase = createAdminClient();
    } catch (err) {
      console.error('Failed to create admin client:', err);
      return NextResponse.json(
        { error: 'Server configuration error - missing service role key' },
        { status: 500 }
      );
    }

    // First check if rating exists
    const { data: existingRating } = await adminSupabase
      .from('player_admin_ratings')
      .select('id')
      .eq('player_id', player_id)
      .eq('organization_id', organization_id)
      .single();

    let rating;
    let error;

    if (existingRating) {
      // Update existing rating
      const result = await adminSupabase
        .from('player_admin_ratings')
        .update({
          rating_stars,
          rated_by_admin_id: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('player_id', player_id)
        .eq('organization_id', organization_id)
        .select()
        .single();

      rating = result.data;
      error = result.error;
    } else {
      // Insert new rating
      const result = await adminSupabase
        .from('player_admin_ratings')
        .insert({
          player_id,
          organization_id,
          rating_stars,
          rated_by_admin_id: user.id,
        })
        .select()
        .single();

      rating = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Error saving rating:', error);
      return NextResponse.json(
        { error: `Failed to save rating: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ rating });
  } catch (error) {
    console.error('Rating API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organization_id = searchParams.get('organization_id');

    if (!organization_id) {
      return NextResponse.json(
        { error: 'organization_id required' },
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

    // Get all ratings for the organization
    const { data: ratings, error } = await supabase
      .from('player_admin_ratings')
      .select('player_id, rating_stars')
      .eq('organization_id', organization_id);

    if (error) {
      console.error('Error fetching ratings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch ratings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ratings });
  } catch (error) {
    console.error('Rating API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
