/**
 * Auth callback route handler
 * Handles email verification and OAuth callbacks
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/organizations';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user has completed profile
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: playerData } = await supabase
          .from('players')
          .select('profile_completed')
          .eq('user_id', user.id)
          .single();
        const player = playerData as { profile_completed: boolean } | null;

        // Redirect to profile if not completed, then to organizations
        if (!player || !player.profile_completed) {
          return NextResponse.redirect(`${origin}/profile?next=/organizations`);
        }
      }

      // Default redirect to organizations (where pending join code will be picked up)
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to login on error
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
