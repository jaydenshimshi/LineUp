/**
 * Announcements API
 * GET: Fetch announcements for an organization
 * POST: Create announcement (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const organization_id = searchParams.get('organization_id');
    const date = searchParams.get('date'); // Optional: filter by specific date

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!organization_id) {
      return NextResponse.json(
        { error: 'organization_id required' },
        { status: 400 }
      );
    }

    // Verify user is member of organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', organization_id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Build query for active announcements
    let query = supabase
      .from('announcements')
      .select('*')
      .eq('organization_id', organization_id)
      .lte('visible_from', now)
      .or(`visible_until.is.null,visible_until.gte.${now}`)
      .order('created_at', { ascending: false });

    // If date specified, get global + date-specific announcements
    if (date) {
      query = query.or(`scope_type.eq.global,scope_date.eq.${date}`);
    }

    const { data: announcements, error } = await query;

    if (error) {
      console.error('Error fetching announcements:', error);
      return NextResponse.json(
        { error: 'Failed to fetch announcements' },
        { status: 500 }
      );
    }

    return NextResponse.json({ announcements });
  } catch (error) {
    console.error('Announcements API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
      title,
      message,
      scope_type = 'global',
      scope_date,
      urgency = 'info',
      visible_from,
      visible_until,
    } = body;

    if (!organization_id || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: organization_id, title, message' },
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

    // Validate scope_type and scope_date
    if (scope_type === 'date' && !scope_date) {
      return NextResponse.json(
        { error: 'scope_date required for date-specific announcements' },
        { status: 400 }
      );
    }

    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert({
        organization_id,
        title,
        message,
        scope_type,
        scope_date: scope_type === 'date' ? scope_date : null,
        urgency,
        visible_from: visible_from || new Date().toISOString(),
        visible_until: visible_until || null,
        created_by: user.id,
      } as never)
      .select()
      .single();

    if (error) {
      console.error('Error creating announcement:', error);
      return NextResponse.json(
        { error: 'Failed to create announcement' },
        { status: 500 }
      );
    }

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    console.error('Announcements API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
