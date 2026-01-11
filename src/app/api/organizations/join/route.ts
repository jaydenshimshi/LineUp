/**
 * Join Organization API Route
 *
 * Allows users to join an organization using a join code.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/organizations/join
 * Join an organization by code
 */
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
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Join code is required' },
        { status: 400 }
      );
    }

    // Find organization by join code
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('join_code', code.toUpperCase())
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Invalid join code. Please check and try again.' },
        { status: 404 }
      );
    }

    const orgData = org as { id: string; name: string; slug: string };

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', orgData.id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this group' },
        { status: 400 }
      );
    }

    // Add as member
    const { error: memberError } = await supabase
      .from('memberships')
      .insert({
        user_id: user.id,
        organization_id: orgData.id,
        role: 'member',
      } as never);

    if (memberError) {
      console.error('Error joining organization:', memberError);
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      organization: orgData,
      message: `Welcome to ${orgData.name}!`,
    });
  } catch (err) {
    console.error('Join organization error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
