/**
 * API route for deleting user accounts
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function DELETE() {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all user's data in order (due to foreign key constraints)

    // 1. Delete check-ins associated with user's players
    const { data: playerIds } = await adminSupabase
      .from('players')
      .select('id')
      .eq('user_id', user.id);

    if (playerIds && playerIds.length > 0) {
      const ids = playerIds.map((p: { id: string }) => p.id);

      // Delete checkins for user's players
      await adminSupabase
        .from('checkins')
        .delete()
        .in('player_id', ids);

      // Delete team assignments for user's players
      await adminSupabase
        .from('team_assignments')
        .delete()
        .in('player_id', ids);

      // Delete ratings for user's players
      await adminSupabase
        .from('player_admin_ratings')
        .delete()
        .in('player_id', ids);
    }

    // 2. Delete user's player profiles
    await adminSupabase
      .from('players')
      .delete()
      .eq('user_id', user.id);

    // 3. Delete user's memberships
    await adminSupabase
      .from('memberships')
      .delete()
      .eq('user_id', user.id);

    // 4. Delete announcements created by user (optional - might want to keep them)
    await adminSupabase
      .from('announcements')
      .delete()
      .eq('created_by', user.id);

    // 5. Delete ratings created by user as admin
    await adminSupabase
      .from('player_admin_ratings')
      .delete()
      .eq('rated_by_admin_id', user.id);

    // 6. Delete user record from users table
    await adminSupabase
      .from('users')
      .delete()
      .eq('id', user.id);

    // 7. Delete the auth user (this will sign them out)
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError);
      // Continue anyway - the data is deleted
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
