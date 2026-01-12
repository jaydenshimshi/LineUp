/**
 * Supabase middleware client
 * Use this for Next.js middleware to handle auth session refresh
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './types';

/**
 * Updates the Supabase session in middleware
 * Handles cookie refresh and session management
 * @param request - Next.js request object
 * @returns Response with updated cookies
 */
export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const defaultResponse = NextResponse.next({ request });

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      supabaseResponse: defaultResponse,
      user: null,
      supabase: null,
    };
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  // Session timeout: 2 days (in seconds)
  const SESSION_TIMEOUT = 2 * 24 * 60 * 60; // 2 days

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, {
            ...options,
            maxAge: SESSION_TIMEOUT,
          })
        );
      },
    },
  });

  // Refresh session if expired - important for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user, supabase };
}
