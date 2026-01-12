/**
 * Next.js Middleware for authentication and route protection
 */

import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = ['/login', '/register', '/auth/callback', '/join'];

/**
 * Admin-only routes
 */
const ADMIN_ROUTES = ['/admin'];

/**
 * Middleware function to handle authentication and route protection
 * @param request - Incoming request
 * @returns Response or redirect
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Update session and get user
  const { supabaseResponse, user, supabase } = await updateSession(request);

  // Check if route is public
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Allow public routes without auth
  if (isPublicRoute) {
    // Redirect authenticated users away from auth pages
    if (user && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return supabaseResponse;
  }

  // Redirect unauthenticated users to login
  if (!user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Check admin routes
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));

  if (isAdminRoute && supabase) {
    // Verify user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = userData as { role: string } | null;
    if (!userRole || userRole.role !== 'admin') {
      // Redirect non-admins to dashboard
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
