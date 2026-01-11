/**
 * Admin Promotion API Route
 *
 * Promotes a user to admin if they provide the correct setup code.
 * This is used during registration for initial admin setup.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_SETUP_CODE = process.env.ADMIN_SETUP_CODE;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, adminCode } = body;

    if (!userId || !adminCode) {
      return NextResponse.json(
        { error: 'User ID and admin code are required' },
        { status: 400 }
      );
    }

    // Verify the admin code
    if (!ADMIN_SETUP_CODE || adminCode !== ADMIN_SETUP_CODE) {
      return NextResponse.json(
        { error: 'Invalid admin code' },
        { status: 403 }
      );
    }

    // Use service role to update user role
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ role: 'admin' })
      .eq('id', userId);

    if (updateError) {
      console.error('Error promoting user:', updateError);
      return NextResponse.json(
        { error: 'Failed to promote user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User promoted to admin successfully',
    });
  } catch (err) {
    console.error('Admin promotion error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
