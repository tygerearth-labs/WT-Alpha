import { NextRequest, NextResponse } from 'next/server';
import { verifySessionTokenFromValue } from '@/lib/session';

// Routes that do NOT require authentication
const PUBLIC_API_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/platform-config',
  '/api/announcements',
];

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('session')?.value;
  const userId = await verifySessionTokenFromValue(sessionToken);

  // Protect API routes
  if (pathname.startsWith('/api/')) {
    // Allow public API routes
    if (isPublicApiRoute(pathname)) {
      return NextResponse.next();
    }

    // Require authentication for all other API routes
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Protect admin API routes
    if (pathname.startsWith('/api/admin/')) {
      // We need to verify admin role from the database.
      // Since middleware runs on the Edge, we do a lightweight check.
      // The actual admin verification is also done in the route handlers via requireAdmin().
      // Here we just verify the session is valid (signed) — the route handler does the role check.
      // But we add an extra layer: check if the session cookie is properly signed.
      // The userId is already verified by verifySessionTokenFromValue above.
      // The route handler's requireAdmin() will check the actual role from DB.
      return NextResponse.next();
    }

    return NextResponse.next();
  }

  // The root page (/) handles its own auth state in the client component.
  // If not authenticated, it shows the landing page. If authenticated, it shows the dashboard.
  // We don't redirect here to avoid breaking the client-side rendering.

  // Protect /admin route (page-level) — just verify session exists.
  // The admin page component does its own role check.
  if (pathname.startsWith('/admin')) {
    if (!userId) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
