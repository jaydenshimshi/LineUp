/**
 * Admin Check-ins API
 * POST: Check in a player for a date
 * DELETE: Check out a player for a date
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
    const { player_id, organization_id, date } = body;

    if (!player_id || !organization_id || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: player_id, organization_id, date' },
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

    // Check if check-in already exists
    const { data: existing } = await adminSupabase
      .from('checkins')
      .select('id')
      .eq('player_id', player_id)
      .eq('date', date)
      .single();

    const checkinTimestamp = new Date().toISOString();

    if (existing) {
      // Update to checked_in with fresh timestamp
      const { error } = await adminSupabase
        .from('checkins')
        .update({
          status: 'checked_in',
          checked_in_at: checkinTimestamp,
        })
        .eq('player_id', player_id)
        .eq('date', date);

      if (error) {
        console.error('Error updating check-in:', error);
        return NextResponse.json(
          { error: `Failed to check in: ${error.message}` },
          { status: 500 }
        );
      }
    } else {
      // Create new check-in with timestamp
      const { error } = await adminSupabase.from('checkins').insert({
        player_id,
        organization_id,
        date,
        status: 'checked_in',
        checked_in_at: checkinTimestamp,
      });

      if (error) {
        console.error('Error creating check-in:', error);
        return NextResponse.json(
          { error: `Failed to check in: ${error.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin Check-ins API error:', error);
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

    const body = await request.json();
    const { player_id, organization_id, date } = body;

    if (!player_id || !organization_id || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: player_id, organization_id, date' },
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

    // Update to checked_out or delete
    const { error } = await adminSupabase
      .from('checkins')
      .update({ status: 'checked_out' })
      .eq('player_id', player_id)
      .eq('date', date);

    if (error) {
      console.error('Error updating check-in:', error);
      return NextResponse.json(
        { error: `Failed to check out: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin Check-ins API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
