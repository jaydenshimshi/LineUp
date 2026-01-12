/**
 * Get Checked-in Players API
 * Returns list of players checked in for a specific date
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const organizationId = searchParams.get('organizationId');

    if (!date || !organizationId) {
      return NextResponse.json(
        { error: 'Missing date or organizationId' },
        { status: 400 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a member of this organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // Get all checked-in players for this date with their info
    // Order by checked_in_at for first-come-first-serve ordering
    const { data: checkins, error } = await supabase
      .from('checkins')
      .select(`
        id,
        checked_in_at,
        players (
          id,
          full_name,
          main_position,
          contact_email,
          contact_phone,
          contact_opt_in,
          user_id
        )
      `)
      .eq('organization_id', organizationId)
      .eq('date', date)
      .eq('status', 'checked_in')
      .order('checked_in_at', { ascending: true });

    if (error) {
      console.error('Error fetching checkins:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get membership info to determine who is admin
    const playerUserIds = (checkins || [])
      .map((c: { players: { user_id: string } | null }) => c.players?.user_id)
      .filter(Boolean);

    const { data: memberships } = await supabase
      .from('memberships')
      .select('user_id, role')
      .eq('organization_id', organizationId)
      .in('user_id', playerUserIds);

    const roleMap: Record<string, string> = {};
    (memberships || []).forEach((m: { user_id: string; role: string }) => {
      roleMap[m.user_id] = m.role;
    });

    // Format the response
    const players = (checkins || []).map((checkin: {
      id: string;
      checked_in_at: string;
      players: {
        id: string;
        full_name: string;
        main_position: string;
        contact_email: string | null;
        contact_phone: string | null;
        contact_opt_in: boolean;
        user_id: string;
      } | null;
    }, index: number) => {
      const player = checkin.players;
      if (!player) return null;

      const role = roleMap[player.user_id] || 'member';
      const isAdmin = role === 'admin' || role === 'owner';
      const showContact = player.contact_opt_in;

      return {
        id: player.id,
        name: player.full_name,
        position: player.main_position,
        isAdmin,
        role,
        checkinOrder: index + 1,
        checkedInAt: checkin.checked_in_at,
        contact: showContact ? {
          email: player.contact_email,
          phone: player.contact_phone,
        } : null,
      };
    }).filter(Boolean);

    return NextResponse.json({ players });
  } catch (err) {
    console.error('Checkins players error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
