import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = 'sentinel_session';
const SECRET_KEY = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'default-sentinel-recon-jwt-session-secret-key-32chars!'
);

interface SessionClaims {
  userId: string;
  email: string;
  name: string;
  systemRole: string;
  tokenVersion?: number;
}

async function verifyTokenEdge(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionClaims;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /programs and /admin routes
  const isProgramRoute = pathname.startsWith('/programs');
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/v1/admin');

  if (isProgramRoute || isAdminRoute) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const claims = await verifyTokenEdge(sessionCookie);
    if (!claims) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized: Invalid or expired session' }, { status: 401 });
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }

    // Role-based authorization for admin routes
    if (isAdminRoute && claims.systemRole !== 'ADMIN') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden: Administrator privileges required' }, { status: 403 });
      }
      // Redirect non-admin users to programs overview
      return NextResponse.redirect(new URL('/programs', request.url));
    }
  }

  // Allow request to proceed
  const response = NextResponse.next();

  // Apply defense-in-depth security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, svgs, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
