/**
 * Organizations API Route
 *
 * Handles organization CRUD operations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/organizations
 * Get user's organizations
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's memberships with organization data
    const { data: memberships, error } = await supabase
      .from('memberships')
      .select(`
        id,
        role,
        joined_at,
        organizations (
          id,
          name,
          slug,
          description,
          sport,
          logo_url,
          is_public,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Error fetching organizations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ memberships });
  } catch (err) {
    console.error('Organizations GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/organizations
 * Create a new organization
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
    const { name, slug, description, sport = 'soccer' } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    // Check if slug is taken
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'This URL is already taken. Try another.' },
        { status: 400 }
      );
    }

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug,
        description: description || null,
        sport,
        created_by: user.id,
      } as never)
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', orgError);
      return NextResponse.json({ error: orgError.message }, { status: 500 });
    }

    // Add creator as owner
    const { error: memberError } = await supabase
      .from('memberships')
      .insert({
        user_id: user.id,
        organization_id: (org as { id: string }).id,
        role: 'owner',
      } as never);

    if (memberError) {
      console.error('Error adding owner membership:', memberError);
      // Rollback org creation
      await supabase.from('organizations').delete().eq('id', (org as { id: string }).id);
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      organization: org,
      message: 'Organization created successfully',
    });
  } catch (err) {
    console.error('Organizations POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
