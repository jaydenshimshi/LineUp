/**
 * Join Organization API Route
 *
 * Allows users to join an organization using a join code.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/organizations/join
 * Join an organization by code
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

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

    // Find organization by join code using admin client (bypasses RLS)
    // This is needed because non-members can't see orgs they're not part of
    const { data: org, error: orgError } = await adminSupabase
      .from('organizations')
      .select('id, name, slug')
      .eq('join_code', code.toUpperCase().trim())
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Invalid join code. Please check and try again.' },
        { status: 404 }
      );
    }

    const orgData = org as { id: string; name: string; slug: string };

    // Check if already a member using admin client
    const { data: existingMember } = await adminSupabase
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

    // Ensure user exists in public.users table
    const { data: existingUser } = await adminSupabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!existingUser) {
      // Create user record
      await adminSupabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email || '',
          role: 'player',
        });
    }

    // Add as member using admin client
    const { error: memberError } = await adminSupabase
      .from('memberships')
      .insert({
        user_id: user.id,
        organization_id: orgData.id,
        role: 'member',
      });

    if (memberError) {
      console.error('Error joining organization:', memberError);
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    // Check if user has a profile in any other organization and copy it
    const { data: existingProfile } = await adminSupabase
      .from('players')
      .select('full_name, age, main_position, alt_position, contact_email, contact_phone, contact_opt_in')
      .eq('user_id', user.id)
      .eq('profile_completed', true)
      .limit(1)
      .single();

    if (existingProfile) {
      // Copy profile to new organization
      const profileData = existingProfile as {
        full_name: string;
        age: number;
        main_position: string;
        alt_position: string | null;
        contact_email: string | null;
        contact_phone: string | null;
        contact_opt_in: boolean;
      };

      const { error: playerError } = await adminSupabase
        .from('players')
        .insert({
          user_id: user.id,
          organization_id: orgData.id,
          full_name: profileData.full_name,
          age: profileData.age,
          main_position: profileData.main_position,
          alt_position: profileData.alt_position,
          contact_email: profileData.contact_email,
          contact_phone: profileData.contact_phone,
          contact_opt_in: profileData.contact_opt_in,
          profile_completed: true,
        });

      if (playerError) {
        console.error('Error copying player profile:', playerError);
        // Don't fail the join, just log the error - user can complete profile manually
      }
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
